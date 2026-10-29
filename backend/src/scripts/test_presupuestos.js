// backend/src/scripts/test_presupuestos.js
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
  for (const [t, c] of [['promociones', 'solo_completo'], ['presupuesto_items', 'modalidad'],
    ['plan_tratamientos', 'presupuesto_item_id'], ['plan_tratamientos', 'consentimiento_firmado_id'],
    ['consentimientos_firmados', 'plan_tratamiento_id']]) {
    assert.ok(await columna(t, c), `falta ${t}.${c}`);
  }
  await assert.rejects(
    pool.query(`INSERT INTO promociones (nombre, descuento_pct, fecha_inicio, fecha_fin) VALUES ('x', 0, '2026-01-01', '2026-01-02')`),
    /check/i, 'descuento 0 debería violar CHECK');
  console.log('✓ migración 051');
}

async function testPromociones() {
  const P = require('../services/promociones');
  assert.strictEqual(P.calcularItem({ precio_unitario: 1000, sesiones: 3, descuento_pct: 20 }).subtotal, 2400);
  assert.strictEqual(P.calcularItem({ precio_unitario: 333.33, sesiones: 3, descuento_pct: 15 }).subtotal, 849.99);
  assert.strictEqual(P.calcularItem({ precio_unitario: 500, sesiones: 1, descuento_pct: 0 }).subtotal, 500);

  const { rows: [t, otro] } = await pool.query('SELECT id FROM tratamientos WHERE activo ORDER BY id LIMIT 2');
  const ids = [];
  try {
    const buenFin = await P.crear({ nombre: 'TEST Buen Fin', descuento_pct: 20, fecha_inicio: '2026-11-03',
      fecha_fin: '2026-11-16', solo_completo: false, tratamiento_ids: [t.id] }, null);
    ids.push(buenFin.id);
    assert.deepStrictEqual(buenFin.tratamiento_ids, [t.id]);
    assert.ok((await P.promosVigentes([t.id], '2026-11-10')).some(p => p.id === buenFin.id));
    assert.ok(!(await P.promosVigentes([t.id], '2026-11-17')).some(p => p.id === buenFin.id));
    assert.ok(!(await P.promosVigentes([otro.id], '2026-11-10')).some(p => p.id === buenFin.id));

    const completo = await P.crear({ nombre: 'TEST Completo', descuento_pct: 15, fecha_inicio: '2026-10-01',
      fecha_fin: '2026-10-31', solo_completo: true, tratamiento_ids: [t.id] }, null);
    ids.push(completo.id);
    assert.strictEqual(await P.promoAplicable(completo.id, t.id, 'por_sesion', '2026-10-15'), null);
    assert.strictEqual((await P.promoAplicable(completo.id, t.id, 'completo', '2026-10-15')).id, completo.id);
    assert.strictEqual(await P.promoAplicable(completo.id, otro.id, 'completo', '2026-10-15'), null);
    assert.strictEqual(await P.promoAplicable(completo.id, t.id, 'completo', '2026-11-01'), null);

    await P.desactivar(buenFin.id);
    assert.ok(!(await P.promosVigentes([t.id], '2026-11-10')).some(p => p.id === buenFin.id));

    await assert.rejects(P.crear({ nombre: 'x', descuento_pct: 10, fecha_inicio: '2026-01-01',
      fecha_fin: '2026-01-02', tratamiento_ids: [] }, null), e => e.status === 400);
    await assert.rejects(P.crear({ nombre: 'x', descuento_pct: 10, fecha_inicio: '2026-02-01',
      fecha_fin: '2026-01-02', tratamiento_ids: [t.id] }, null), e => e.status === 400);

    const editada = await P.actualizar(completo.id, { nombre: 'TEST Completo 2', descuento_pct: 10,
      fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', solo_completo: true, tratamiento_ids: [otro.id] });
    assert.deepStrictEqual(editada.tratamiento_ids, [otro.id]);
    console.log('✓ promociones');
  } finally {
    await pool.query('DELETE FROM promociones WHERE id = ANY($1)', [ids]);
  }
}

// Fixtures temporales: 3 tratamientos (2 con precio, 1 sin precio) y 2 pacientes existentes
async function fixtures() {
  const { rows: ts } = await pool.query(
    `INSERT INTO tratamientos (nombre, precio) VALUES ('TEST T1', 1000), ('TEST T2', 500), ('TEST T3 sin precio', NULL)
     RETURNING id`);
  const { rows: ps } = await pool.query('SELECT id FROM pacientes ORDER BY id LIMIT 2');
  return { t1: ts[0].id, t2: ts[1].id, t3: ts[2].id, pa: ps[0].id, pb: ps[1].id };
}
async function limpiarFixtures(f) {
  await pool.query('DELETE FROM presupuesto_items WHERE plan_tratamiento_id IN (SELECT id FROM plan_tratamientos WHERE tratamiento_id = ANY($1))', [[f.t1, f.t2, f.t3]]);
  await pool.query('DELETE FROM presupuestos WHERE id NOT IN (SELECT presupuesto_id FROM presupuesto_items)');
  await pool.query('UPDATE citas SET plan_tratamiento_id = NULL WHERE tratamiento_id = ANY($1)', [[f.t1, f.t2, f.t3]]);
  await pool.query('DELETE FROM citas WHERE tratamiento_id = ANY($1)', [[f.t1, f.t2, f.t3]]);
  await pool.query('DELETE FROM consentimientos_firmados WHERE plan_tratamiento_id IN (SELECT id FROM plan_tratamientos WHERE tratamiento_id = ANY($1))', [[f.t1, f.t2, f.t3]]);
  await pool.query('DELETE FROM plan_tratamientos WHERE tratamiento_id = ANY($1)', [[f.t1, f.t2, f.t3]]);
  await pool.query('DELETE FROM consentimientos WHERE tratamiento_id = ANY($1)', [[f.t1, f.t2, f.t3]]);
  await pool.query('DELETE FROM promociones WHERE nombre LIKE $1', ['TEST%']);
  await pool.query('DELETE FROM tratamientos WHERE id = ANY($1)', [[f.t1, f.t2, f.t3]]);
}
async function plan(pacienteId, tratamientoId, sesiones = 1, estatus = 'sugerido') {
  const { rows: [p] } = await pool.query(
    `INSERT INTO plan_tratamientos (paciente_id, tratamiento_id, sesiones_estimadas, estatus) VALUES ($1,$2,$3,$4) RETURNING id`,
    [pacienteId, tratamientoId, sesiones, estatus]);
  return p.id;
}
const FIRMA = 'data:image/png;base64,iVBORw0KGgo=';
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

async function testPresupuestos() {
  const { crearPresupuesto, getPresupuesto, crearPlanDesdeCita } = require('../services/presupuestos');
  const Promos = require('../services/promociones');
  const f = await fixtures();
  const contar = async () => Number((await pool.query('SELECT count(*) n FROM presupuestos')).rows[0].n);
  try {
    const promo = await Promos.crear({ nombre: 'TEST 20 completo', descuento_pct: 20, fecha_inicio: hoy(), fecha_fin: hoy(),
      solo_completo: true, tratamiento_ids: [f.t1] }, null);
    const p1 = await plan(f.pa, f.t1, 3), p2 = await plan(f.pa, f.t2, 1), p3 = await plan(f.pa, f.t2, 2);

    // promo solo_completo pedida en por_sesion → 400, nada guardado
    const antes = await contar();
    await assert.rejects(crearPresupuesto({ paciente_id: f.pa, firma: FIRMA,
      items: [{ plan_id: p1, modalidad: 'por_sesion', promocion_id: promo.id }] }, null), e => e.status === 400);
    assert.strictEqual(await contar(), antes);

    // cliente intenta mandar precio/subtotal: se ignoran
    const pres = await crearPresupuesto({ paciente_id: f.pa, firma: FIRMA, items: [
      { plan_id: p1, modalidad: 'completo', promocion_id: promo.id, precio_unitario: 1, subtotal: 1 },
      { plan_id: p2, modalidad: 'por_sesion' },
    ] }, null);
    assert.strictEqual(pres.total, 2900);
    const i1 = pres.items.find(i => i.plan_tratamiento_id === p1);
    assert.deepStrictEqual([i1.precio_unitario, i1.sesiones, i1.descuento_pct, i1.subtotal], [1000, 3, 20, 2400]);
    const { rows: est } = await pool.query('SELECT id, estatus, presupuesto_item_id FROM plan_tratamientos WHERE id = ANY($1) ORDER BY id', [[p1, p2, p3]]);
    assert.deepStrictEqual(est.map(r => r.estatus), ['aceptado', 'aceptado', 'sugerido']);
    assert.ok(est[0].presupuesto_item_id && est[1].presupuesto_item_id && !est[2].presupuesto_item_id);

    // plan ya aceptado / de otro paciente / sin firma / sin precio → 400
    await assert.rejects(crearPresupuesto({ paciente_id: f.pa, firma: FIRMA, items: [{ plan_id: p1, modalidad: 'completo' }] }, null), e => e.status === 400);
    const pB = await plan(f.pb, f.t2);
    await assert.rejects(crearPresupuesto({ paciente_id: f.pa, firma: FIRMA, items: [{ plan_id: pB, modalidad: 'por_sesion' }] }, null), e => e.status === 400);
    await assert.rejects(crearPresupuesto({ paciente_id: f.pa, firma: '', items: [{ plan_id: p3, modalidad: 'por_sesion' }] }, null), e => e.status === 400);
    const pSin = await plan(f.pa, f.t3);
    await assert.rejects(crearPresupuesto({ paciente_id: f.pa, firma: FIRMA, items: [{ plan_id: pSin, modalidad: 'por_sesion' }] }, null),
      e => e.status === 400 && /precio/.test(e.message));
    await assert.rejects(crearPresupuesto({ paciente_id: f.pa, firma: FIRMA, items: [] }, null), e => e.status === 400);

    const leido = await getPresupuesto(pres.id);
    assert.strictEqual(leido.firma, FIRMA, 'firma no se descifra igual');
    assert.strictEqual(leido.items.length, 2);
    const { rows: [crudo] } = await pool.query('SELECT firma FROM presupuestos WHERE id=$1', [pres.id]);
    assert.notStrictEqual(crudo.firma, FIRMA, 'firma no está cifrada');

    // pase directo
    const { rows: [cita] } = await pool.query(
      `INSERT INTO citas (nombre_paciente, paciente_id, tratamiento_id, fecha_hora) VALUES ('T',$1,$2,NOW()) RETURNING id`, [f.pa, f.t2]);
    const directo = await crearPlanDesdeCita(cita.id, null);
    assert.strictEqual(directo.estatus, 'sugerido');
    assert.strictEqual((await pool.query('SELECT plan_tratamiento_id FROM citas WHERE id=$1', [cita.id])).rows[0].plan_tratamiento_id, directo.id);
    assert.strictEqual((await crearPlanDesdeCita(cita.id, null)).id, directo.id);
    console.log('✓ presupuestos');
  } finally {
    await limpiarFixtures(f);
  }
}

async function run() {
  await testMigracion();
  await testPromociones();
  await testPresupuestos();
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.message); await pool.end(); process.exit(1); });
