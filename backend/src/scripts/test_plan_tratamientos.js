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

async function run() {
  await testMigracion();
  await testSyncValoracion();
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.message); await pool.end(); process.exit(1); });
