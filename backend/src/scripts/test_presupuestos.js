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

async function run() {
  await testMigracion();
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.message); await pool.end(); process.exit(1); });
