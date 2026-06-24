const pool = require('../db/pool');

exports.hoy = async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Resumen ingresos de hoy por forma de pago
    const resumenQ = await pool.query(`
      SELECT forma_pago, COALESCE(SUM(monto), 0)::numeric AS total
      FROM movimientos
      WHERE tipo = 'ingreso' AND fecha = $1
      GROUP BY forma_pago
    `, [hoy]);

    const resumen = { efectivo: 0, tarjeta: 0, transferencia: 0, total: 0 };
    for (const r of resumenQ.rows) {
      const val = parseFloat(r.total);
      if (resumen[r.forma_pago] !== undefined) resumen[r.forma_pago] = val;
      resumen.total += val;
    }

    // Citas realizadas hoy pendientes de cobro
    const pendientesQ = await pool.query(`
      SELECT c.id AS cita_id,
             TRIM(COALESCE(
               NULLIF(CONCAT_WS(' ',
                 NULLIF(p.apellido_paterno,''), NULLIF(p.apellido_materno,''), NULLIF(p.nombre,'')), ''),
               c.nombre_paciente
             )) AS paciente_nombre,
             t.nombre AS tratamiento_nombre,
             t.precio,
             c.fecha_hora
      FROM citas c
      LEFT JOIN pacientes p   ON c.paciente_id   = p.id
      LEFT JOIN tratamientos t ON c.tratamiento_id = t.id
      WHERE c.estatus = 'realizada'
        AND c.cobrado = false
        AND DATE(c.fecha_hora) = $1
      ORDER BY c.fecha_hora
    `, [hoy]);

    // Todos los movimientos de hoy
    const movsQ = await pool.query(`
      SELECT m.id, m.concepto, m.monto::numeric, m.tipo, m.forma_pago,
             m.cita_id, m.created_at,
             TRIM(COALESCE(
               NULLIF(CONCAT_WS(' ',
                 NULLIF(p.apellido_paterno,''), NULLIF(p.apellido_materno,''), NULLIF(p.nombre,'')), ''),
               ci.nombre_paciente
             )) AS paciente_nombre
      FROM movimientos m
      LEFT JOIN citas ci    ON m.cita_id      = ci.id
      LEFT JOIN pacientes p ON ci.paciente_id = p.id
      WHERE m.fecha = $1
      ORDER BY m.created_at DESC
    `, [hoy]);

    res.json({
      resumen,
      pendientes: pendientesQ.rows,
      movimientos: movsQ.rows,
    });
  } catch (err) { next(err); }
};
