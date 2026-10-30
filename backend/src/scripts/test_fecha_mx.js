// backend/src/scripts/test_fecha_mx.js — Caja y En vivo usan el día de México, no el de UTC
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const assert = require('assert');
const pool = require('../db/pool');

async function run() {
  const { hoyMx } = require('../utils/fecha');
  assert.strictEqual(hoyMx(new Date('2026-10-30T01:00:00Z')), '2026-10-29', '7 pm en México sigue siendo el 29');
  assert.strictEqual(hoyMx(new Date('2026-10-29T07:00:00Z')), '2026-10-29');

  // Citas del día de México a las 00:30 y 23:30: con día UTC una de las dos siempre queda fuera
  const { rows: [t] } = await pool.query(`INSERT INTO tratamientos (nombre, precio) VALUES ('TEST MX', 100) RETURNING id`);
  try {
    const { rows } = await pool.query(
      `INSERT INTO citas (nombre_paciente, tratamiento_id, fecha_hora, estatus)
       SELECT 'T', $1, ((now() AT TIME ZONE 'America/Mexico_City')::date + h) AT TIME ZONE 'America/Mexico_City', 'realizada'
       FROM unnest(ARRAY[time '00:30', time '23:30']) h RETURNING id`, [t.id]);
    const ids = rows.map(r => r.id);

    let out;
    await require('../controllers/cajaController').hoy({ query: {} }, { json: d => { out = d; } }, e => { throw e; });
    for (const id of ids) assert.ok(out.pendientes.some(p => p.cita_id === id), `Caja: falta cita ${id} de hoy (México)`);

    await require('../controllers/flujoController').hoy({ query: {} }, { json: d => { out = d; } }, e => { throw e; });
    const flujo = [...out.activos, ...out.completados];
    for (const id of ids) assert.ok(flujo.some(c => c.cita_id === id), `En vivo: falta cita ${id} de hoy (México)`);

    // un cobro sin fecha queda con el día de México
    const Movs = require('../models/finanzas').Movimiento;
    const mov = await Movs.create({ tipo: 'ingreso', concepto: 'TEST MX', monto: 1, empresa: 'giovanna' });
    const { rows: [m] } = await pool.query(`SELECT to_char(fecha, 'YYYY-MM-DD') f FROM movimientos WHERE id=$1`, [mov.id]);
    await pool.query('DELETE FROM movimientos WHERE id=$1', [mov.id]);
    assert.strictEqual(m.f, hoyMx());
    console.log('✓ día de México');
  } finally {
    await pool.query('DELETE FROM citas WHERE tratamiento_id=$1', [t.id]);
    await pool.query('DELETE FROM tratamientos WHERE id=$1', [t.id]);
  }
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.message); await pool.end(); process.exit(1); });
