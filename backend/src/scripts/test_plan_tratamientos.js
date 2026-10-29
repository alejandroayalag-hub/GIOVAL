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

async function run() {
  await testMigracion();
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.message); await pool.end(); process.exit(1); });
