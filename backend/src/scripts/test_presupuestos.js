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

async function run() {
  await testMigracion();
  await testPromociones();
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.message); await pool.end(); process.exit(1); });
