const pool = require('../db/pool');

class FarmaciaVenta {
  static async findAll(filtros = {}) {
    let query = 'SELECT * FROM farmacia_ventas WHERE 1=1';
    const params = [];
    let paramNum = 1;

    if (filtros.empleado_id) {
      query += ` AND empleado_id = $${paramNum++}`;
      params.push(filtros.empleado_id);
    }
    if (filtros.estado) {
      query += ` AND estado = $${paramNum++}`;
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde && filtros.fecha_hasta) {
      query += ` AND DATE(fecha) BETWEEN $${paramNum++} AND $${paramNum++}`;
      params.push(filtros.fecha_desde, filtros.fecha_hasta);
    }

    query += ' ORDER BY fecha DESC LIMIT 100';
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_ventas WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const { empleado_id, cliente_id, paciente_id, observaciones } = data;
    const { rows } = await pool.query(
      'INSERT INTO farmacia_ventas (empleado_id, cliente_id, paciente_id, estado, fecha, total, observaciones) VALUES ($1, $2, $3, $4, NOW(), 0, $5) RETURNING *',
      [empleado_id, cliente_id || null, paciente_id || null, 'abierta', observaciones || null]
    );
    return rows[0];
  }

  static async agregarItem(venta_id, producto_id, cantidad, precio_unitario) {
    const subtotal = cantidad * precio_unitario;
    const { rows } = await pool.query(
      'INSERT INTO farmacia_items_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [venta_id, producto_id, cantidad, precio_unitario, subtotal]
    );

    await this.recalcularTotal(venta_id);
    return rows[0];
  }

  static async removerItem(venta_id, item_id) {
    await pool.query('DELETE FROM farmacia_items_venta WHERE id = $1 AND venta_id = $2', [item_id, venta_id]);
    await this.recalcularTotal(venta_id);
  }

  static async recalcularTotal(venta_id) {
    const { rows } = await pool.query('SELECT COALESCE(SUM(subtotal), 0) as total FROM farmacia_items_venta WHERE venta_id = $1', [venta_id]);
    const total = rows[0]?.total || 0;
    await pool.query('UPDATE farmacia_ventas SET total = $1, subtotal = $1 WHERE id = $2', [total, venta_id]);
  }

  static async pagar(venta_id, metodo_pago) {
    if (!['efectivo', 'terminal', 'transferencia'].includes(metodo_pago)) {
      throw new Error('Método de pago inválido');
    }
    await pool.query('UPDATE farmacia_ventas SET estado = $1, metodo_pago = $2 WHERE id = $3', ['pagada', metodo_pago, venta_id]);
  }

  static async cancelar(venta_id) {
    await pool.query('UPDATE farmacia_ventas SET estado = $1 WHERE id = $2', ['cancelada', venta_id]);
  }

  static async getItems(venta_id) {
    const { rows } = await pool.query(
      'SELECT fiv.*, fp.nombre, fp.precio_costo FROM farmacia_items_venta fiv JOIN farmacia_productos fp ON fiv.producto_id = fp.id WHERE fiv.venta_id = $1',
      [venta_id]
    );
    return rows;
  }
}

module.exports = FarmaciaVenta;
