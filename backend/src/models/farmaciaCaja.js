const pool = require('../db/pool');

// Totales de ventas pagadas de una caja, por método de pago
const TOTALES_SQL = `
  SELECT COUNT(*)::int AS num_ventas,
         COALESCE(SUM(total), 0)::numeric AS total_ventas,
         COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'efectivo'), 0)::numeric AS ventas_efectivo,
         COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'terminal'), 0)::numeric AS ventas_terminal,
         COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'transferencia'), 0)::numeric AS ventas_transferencia
  FROM farmacia_ventas WHERE caja_id = $1 AND estado = 'pagada'`;

class FarmaciaCaja {
  static async findAbiertaEmpleado(empleado_id) {
    const { rows } = await pool.query(
      `SELECT * FROM farmacia_caja WHERE empleado_id = $1 AND estado = 'abierta'`, [empleado_id]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_caja WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async totales(caja_id) {
    const { rows } = await pool.query(TOTALES_SQL, [caja_id]);
    return rows[0];
  }

  static async abrir(empleado_id, efectivo_inicial) {
    if (await this.findAbiertaEmpleado(empleado_id)) {
      throw new Error('Ya tienes una caja abierta');
    }
    const { rows } = await pool.query(
      `INSERT INTO farmacia_caja (empleado_id, fecha_apertura, efectivo_inicial, estado)
       VALUES ($1, NOW(), $2, 'abierta') RETURNING *`,
      [empleado_id, efectivo_inicial]
    );
    return rows[0];
  }

  // Corte: esperado = inicial + ventas en efectivo; diferencia = contado − esperado
  static async cerrar(caja_id, efectivo_final) {
    const caja = await this.findById(caja_id);
    if (!caja) throw new Error('Caja no encontrada');
    if (caja.estado === 'cerrada') throw new Error('La caja ya está cerrada');

    const { ventas_efectivo } = await this.totales(caja_id);
    const esperado = parseFloat(caja.efectivo_inicial) + parseFloat(ventas_efectivo);
    const diferencia = Math.round((efectivo_final - esperado) * 100) / 100;
    const { rows } = await pool.query(
      `UPDATE farmacia_caja SET fecha_cierre = NOW(), efectivo_final = $1, efectivo_esperado = $2,
              diferencia = $3, estado = 'cerrada', actualizado_en = NOW()
       WHERE id = $4 AND estado = 'abierta' RETURNING *`,
      [efectivo_final, esperado, diferencia, caja_id]
    );
    if (!rows[0]) throw new Error('La caja ya está cerrada');
    return rows[0];
  }

  // Cajas con totales; sin empleado_id = todas (supervisión)
  static async getHistorial({ empleado_id, fecha_desde, fecha_hasta, limit = 50 } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (empleado_id) { params.push(empleado_id); where += ` AND c.empleado_id = $${params.length}`; }
    if (fecha_desde && fecha_hasta) {
      params.push(fecha_desde, fecha_hasta);
      where += ` AND DATE(c.fecha_apertura) BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT c.*, u.nombre AS empleado, t.*
       FROM farmacia_caja c
       LEFT JOIN usuarios u ON u.id = c.empleado_id
       CROSS JOIN LATERAL (${TOTALES_SQL.replace('$1', 'c.id')}) t
       ${where}
       ORDER BY c.fecha_apertura DESC LIMIT $${params.length}`,
      params
    );
    return rows;
  }
}

module.exports = FarmaciaCaja;
