// backend/src/scripts/test_consentimientos_generales.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const assert = require('assert');
const pool = require('../db/pool');

async function run() {
  const { rows } = await pool.query(
    `SELECT codigo, titulo, texto_consentimiento, tratamiento_id
     FROM consentimientos WHERE codigo IN ('CI-00','CI-01') ORDER BY codigo`
  );
  assert.strictEqual(rows.length, 2, `esperaba 2 filas generales, encontré ${rows.length}`);
  assert.strictEqual(rows[0].codigo, 'CI-00');
  assert.strictEqual(rows[1].codigo, 'CI-01');
  for (const r of rows) {
    assert.ok(r.texto_consentimiento && r.texto_consentimiento.length > 100, `${r.codigo} sin texto`);
    assert.strictEqual(r.tratamiento_id, null, `${r.codigo} no debería tener tratamiento_id`);
  }
  console.log('✓ CI-00 y CI-01 sembrados correctamente');
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
