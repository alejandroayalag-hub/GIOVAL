const pool = require('../db/pool');

class FarmaciaCaja {
  static async findAbiertaEmpleado(empleado_id) {
    const { rows } = await pool.query(
      'SELECT * FROM farmacia_caja WHERE empleado_id = $1 AND estado = $2 ORDER BY fecha_apertura DESC LIMIT 1',
      [empleado_id, 'abierta']
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_caja WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async abrir(empleado_id, efectivo_inicial) {
    const cajaAbierta = await this.findAbiertaEmpleado(empleado_id);
    if (cajaAbierta) {
      throw new Error('Ya hay una caja abierta para este empleado');
    }

    const { rows } = await pool.query(
      'INSERT INTO farmacia_caja (empleado_id, fecha_apertura, efectivo_inicial, estado) VALUES ($1, NOW(), $2, $3) RETURNING *',
      [empleado_id, efectivo_inicial, 'abierta']
    );
    return rows[0];
  }

  static async cerrar(caja_id, efectivo_final) {
    const caja = await this.findById(caja_id);
    if (!caja) throw new Error('Caja no encontrada');
    if (caja.estado === 'cerrada') throw new Error('Caja ya está cerrada');

    const diferencia = efectivo_final - caja.efectivo_inicial;
    const { rows } = await pool.query(
      'UPDATE farmacia_caja SET fecha_cierre = NOW(), efectivo_final = $1, diferencia = $2, estado = $3 WHERE id = $4 RETURNING *',
      [efectivo_final, diferencia, 'cerrada', caja_id]
    );

    return rows[0];
  }

  static async getHistorial(empleado_id, limit = 10) {
    const { rows } = await pool.query(
      'SELECT * FROM farmacia_caja WHERE empleado_id = $1 ORDER BY fecha_apertura DESC LIMIT $2',
      [empleado_id, limit]
    );
    return rows;
  }
}

module.exports = FarmaciaCaja;
