// backend/src/scripts/test_plan_tratamientos.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const assert = require('assert');
const pool = require('../db/pool');

async function columna(tabla, col) {
  const { rows } = await pool.query(
    'SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2', [tabla, col]);
  return rows.length === 1;
}

async function testMigracion() {
  assert.ok(await columna('plan_tratamientos', 'estatus'), 'falta plan_tratamientos.estatus');
  assert.ok(await columna('citas', 'plan_tratamiento_id'), 'falta citas.plan_tratamiento_id');
  assert.ok(await columna('documentos_clinicos', 'cita_id'), 'falta documentos_clinicos.cita_id');
  const { rows: [p] } = await pool.query('SELECT id FROM pacientes LIMIT 1');
  const { rows: [t] } = await pool.query('SELECT id FROM tratamientos LIMIT 1');
  await assert.rejects(
    pool.query(`INSERT INTO plan_tratamientos (paciente_id, tratamiento_id, estatus) VALUES ($1,$2,'otro')`, [p.id, t.id]),
    /check/i, 'estatus inválido debería violar CHECK');
  console.log('✓ migración 050');
}

async function contar(sql, params) {
  const { rows: [r] } = await pool.query(sql, params);
  return Number(r.n);
}

async function testSyncValoracion() {
  const DocClinico = require('../models/documentoClinico');
  const { syncDesdeValoracion } = require('../services/planTratamiento');
  const { rows: [p] } = await pool.query('SELECT id FROM pacientes LIMIT 1');
  const { rows: ts } = await pool.query('SELECT id FROM tratamientos WHERE activo ORDER BY id LIMIT 2');
  const docsCreados = [];
  try {
    // (a) crear val_01 con dx + 2 tratamientos
    let doc = await DocClinico.create({
      paciente_id: p.id, tipo: 'val_01', datos: {
        plan: {
          diagnostico_cie10: 'L70.0', diagnostico_texto: 'acné', diagnostico_id: null,
          tratamientos: [
            { tratamiento_id: ts[0].id, sesiones: 3, frecuencia: 'cada 15 días', notas: '' },
            { tratamiento_id: ts[1].id, sesiones: 1, frecuencia: '', notas: 'x' },
          ],
        },
      },
    });
    docsCreados.push(doc.id);
    doc = await syncDesdeValoracion(doc, null);
    const dxId = doc.datos.plan.diagnostico_id;
    assert.ok(dxId, 'no guardó diagnostico_id');
    assert.strictEqual(await contar('SELECT count(*) n FROM paciente_diagnosticos WHERE id=$1 AND cie10_codigo=$2 AND notas=$3', [dxId, 'L70.0', 'acné']), 1);
    assert.strictEqual(await contar(`SELECT count(*) n FROM plan_tratamientos WHERE valoracion_id=$1 AND estatus='sugerido' AND diagnostico_id=$2`, [doc.id, dxId]), 2);
    assert.ok(doc.datos.plan.tratamientos.every(t => t.plan_id), 'filas sin plan_id');
    assert.strictEqual(await contar('SELECT count(*) n FROM plan_tratamientos WHERE valoracion_id=$1 AND sesiones_estimadas=3', [doc.id]), 1);

    // (b) re-sync no duplica
    doc = await syncDesdeValoracion(doc, null);
    assert.strictEqual(await contar('SELECT count(*) n FROM paciente_diagnosticos WHERE paciente_id=$1 AND notas=$2', [p.id, 'acné']), 1, 'duplicó dx');
    assert.strictEqual(await contar('SELECT count(*) n FROM plan_tratamientos WHERE valoracion_id=$1', [doc.id]), 2, 'duplicó planes');

    // (c) aceptado no se toca al quitarlo de la lista
    const aceptadoId = doc.datos.plan.tratamientos[0].plan_id;
    await pool.query(`UPDATE plan_tratamientos SET estatus='aceptado' WHERE id=$1`, [aceptadoId]);
    doc.datos.plan.tratamientos = [];
    doc = await syncDesdeValoracion(doc, null);
    const { rows: quedan } = await pool.query('SELECT id, estatus, sesiones_estimadas FROM plan_tratamientos WHERE valoracion_id=$1', [doc.id]);
    assert.deepStrictEqual(quedan.map(r => [r.id, r.estatus, r.sesiones_estimadas]), [[aceptadoId, 'aceptado', 3]]);

    // (d) valoración sin plan → nada
    const d2 = await DocClinico.create({ paciente_id: p.id, tipo: 'val_02', datos: { peso: 70 } });
    docsCreados.push(d2.id);
    await syncDesdeValoracion(d2, null);
    assert.strictEqual(await contar('SELECT count(*) n FROM plan_tratamientos WHERE valoracion_id=$1', [d2.id]), 0);

    // (e) tipo no-valoración con plan → ignorado
    const d3 = await DocClinico.create({ paciente_id: p.id, tipo: 'proc_01', datos: { plan: { tratamientos: [{ tratamiento_id: ts[0].id, sesiones: 1 }] } } });
    docsCreados.push(d3.id);
    await syncDesdeValoracion(d3, null);
    assert.strictEqual(await contar('SELECT count(*) n FROM plan_tratamientos WHERE valoracion_id=$1', [d3.id]), 0);
    console.log('✓ sync valoración → diagnóstico + sugeridos');
  } finally {
    await pool.query('DELETE FROM plan_tratamientos WHERE valoracion_id = ANY($1)', [docsCreados]);
    await pool.query(`DELETE FROM paciente_diagnosticos WHERE paciente_id=$1 AND notas='acné'`, [p.id]);
    await pool.query('DELETE FROM documentos_clinicos WHERE id = ANY($1)', [docsCreados]);
  }
}

async function testAvanceEHistorial() {
  const Cita = require('../models/cita');
  const DocClinico = require('../models/documentoClinico');
  const { listarPorPaciente, actualizarAvance, historial } = require('../services/planTratamiento');
  const { rows: [p] } = await pool.query('SELECT id FROM pacientes LIMIT 1');
  const { rows: [t] } = await pool.query(`SELECT id, nombre FROM tratamientos WHERE activo AND nombre NOT ILIKE 'valoraci%' ORDER BY id LIMIT 1`);
  const { rows: [plan] } = await pool.query(
    `INSERT INTO plan_tratamientos (paciente_id, tratamiento_id, sesiones_estimadas, estatus)
     VALUES ($1,$2,2,'aceptado') RETURNING id`, [p.id, t.id]);
  const citas = [], docs = [];
  try {
    const c1 = await Cita.create({ nombre_paciente: 'Test', tratamiento_id: t.id, paciente_id: p.id,
      fecha_hora: '2020-01-01T10:00:00', plan_tratamiento_id: plan.id });
    citas.push(c1.id);
    assert.strictEqual(c1.plan_tratamiento_id, plan.id, 'Cita.create no guardó plan_tratamiento_id');
    await Cita.update(c1.id, { estatus: 'realizada' });
    await actualizarAvance(plan.id);
    let mio = (await listarPorPaciente(p.id)).find(x => x.id === plan.id);
    assert.strictEqual(mio.sesiones_realizadas, 1);
    assert.strictEqual(mio.estatus, 'aceptado');
    assert.strictEqual(mio.tratamiento_nombre, t.nombre);

    const c2 = await Cita.create({ nombre_paciente: 'Test', tratamiento_id: t.id, paciente_id: p.id,
      fecha_hora: '2020-01-15T10:00:00', plan_tratamiento_id: plan.id });
    citas.push(c2.id);
    await Cita.update(c2.id, { estatus: 'realizada' });
    await actualizarAvance(plan.id);
    mio = (await listarPorPaciente(p.id)).find(x => x.id === plan.id);
    assert.strictEqual(mio.estatus, 'completado');

    // update puede desligar plan con null explícito
    const c3 = await Cita.create({ nombre_paciente: 'Test', tratamiento_id: t.id, paciente_id: p.id,
      fecha_hora: '2020-02-01T10:00:00', plan_tratamiento_id: plan.id });
    citas.push(c3.id);
    assert.strictEqual((await Cita.update(c3.id, { plan_tratamiento_id: null })).plan_tratamiento_id, null);
    assert.strictEqual((await Cita.update(c3.id, { notas: 'x' })).plan_tratamiento_id, null);

    const dLigado = await DocClinico.create({ paciente_id: p.id, tipo: 'proc_01', datos: {}, cita_id: c1.id });
    const dSuelto = await DocClinico.create({ paciente_id: p.id, tipo: 'bit_01', datos: {} });
    docs.push(dLigado.id, dSuelto.id);
    const h = await historial(p.id);
    const s1 = h.sesiones.find(s => s.cita_id === c1.id);
    const s2 = h.sesiones.find(s => s.cita_id === c2.id);
    assert.strictEqual(s1.sesion_n, 1);
    assert.strictEqual(s2.sesion_n, 2);
    assert.strictEqual(s1.sesiones_estimadas, 2);
    assert.deepStrictEqual(s1.documentos.map(d => d.id), [dLigado.id]);
    assert.ok(h.sin_sesion.some(d => d.id === dSuelto.id), 'doc sin cita no está en sin_sesion');
    assert.ok(!h.sesiones.some(s => s.cita_id === c3.id), 'cita no realizada en historial');
    console.log('✓ avance de sesiones + historial');
  } finally {
    await pool.query('DELETE FROM documentos_clinicos WHERE id = ANY($1)', [docs]);
    await pool.query('DELETE FROM citas WHERE id = ANY($1)', [citas]);
    await pool.query('DELETE FROM plan_tratamientos WHERE id=$1', [plan.id]);
  }
}

async function testValidarPlanDeCita() {
  const { validarPlanDeCita } = require('../services/planTratamiento');
  const { rows: ps } = await pool.query('SELECT id FROM pacientes ORDER BY id LIMIT 2');
  assert.ok(ps.length === 2, 'se necesitan 2 pacientes locales');
  const { rows: [t] } = await pool.query('SELECT id FROM tratamientos LIMIT 1');
  const { rows: [plan] } = await pool.query(
    `INSERT INTO plan_tratamientos (paciente_id, tratamiento_id, estatus) VALUES ($1,$2,'aceptado') RETURNING id`, [ps[0].id, t.id]);
  try {
    assert.strictEqual(await validarPlanDeCita(plan.id, ps[0].id), true);
    assert.strictEqual(await validarPlanDeCita(plan.id, ps[1].id), false);
    assert.strictEqual(await validarPlanDeCita(null, ps[1].id), true);
    console.log('✓ validarPlanDeCita');
  } finally {
    await pool.query('DELETE FROM plan_tratamientos WHERE id=$1', [plan.id]);
  }
}

async function run() {
  await testMigracion();
  await testSyncValoracion();
  await testAvanceEHistorial();
  await testValidarPlanDeCita();
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.message); await pool.end(); process.exit(1); });
