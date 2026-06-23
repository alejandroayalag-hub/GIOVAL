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

  const Consentimiento = require('../models/consentimiento');
  const ci00 = await Consentimiento.findByCodigo('CI-00');
  assert.ok(ci00?.id, 'findByCodigo(CI-00) no encontró nada');

  const { rows: pacienteRows } = await pool.query('SELECT id FROM pacientes LIMIT 1');
  if (pacienteRows.length) {
    const pacienteId = pacienteRows[0].id;
    const firmado = await Consentimiento.createFirmado({
      consentimiento_id: ci00.id, paciente_id: pacienteId, cita_id: null,
      nombre_paciente: 'Test Paciente', tratamiento_nombre: null,
      firma_imagen: 'data:image/png;base64,test', firmado_por: null,
      autoriza_fotos: true,
    });
    assert.ok(firmado.id, 'createFirmado no devolvió id');
    const firmados = await Consentimiento.findFirmadosByPaciente(pacienteId);
    const encontrado = firmados.find(f => f.id === firmado.id);
    assert.ok(encontrado, 'findFirmadosByPaciente no regresó el firmado de prueba');
    assert.strictEqual(encontrado.codigo, 'CI-00');
    assert.strictEqual(encontrado.autoriza_fotos, true);
    await pool.query('DELETE FROM consentimientos_firmados WHERE id = $1', [firmado.id]);
    console.log('✓ firmar/listar consentimiento general con autoriza_fotos funciona');
  } else {
    console.log('⚠ sin pacientes en BD, se omite prueba de firmado (no es error)');
  }

  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
