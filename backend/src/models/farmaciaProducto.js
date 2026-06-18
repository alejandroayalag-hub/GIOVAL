const pool = require('../db/pool');

class FarmaciaProducto {
  static async findAll(filtros = {}) {
    let query = 'SELECT * FROM farmacia_productos WHERE activo = true';
    const params = [];

    if (filtros.nombre) {
      query += ' AND nombre ILIKE $' + (params.length + 1);
      params.push(`%${filtros.nombre}%`);
    }

    if (filtros.proveedor_id) {
      query += ' AND proveedor_id = $' + (params.length + 1);
      params.push(filtros.proveedor_id);
    }

    if (filtros.stock_bajo) {
      query += ' AND stock <= stock_minimo';
    }

    query += ' ORDER BY nombre ASC';
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_productos WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async create(data) {
    const { nombre, codigo_proveedor, categoria, precio_costo, precio_venta, stock, stock_minimo, proveedor_id } = data;

    if (precio_venta < precio_costo) {
      throw new Error('Precio de venta no puede ser menor que costo');
    }

    const { rows } = await pool.query(
      'INSERT INTO farmacia_productos (nombre, codigo_proveedor, categoria, precio_costo, precio_venta, stock, stock_minimo, proveedor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [nombre, codigo_proveedor, categoria, precio_costo, precio_venta, stock || 0, stock_minimo || 5, proveedor_id]
    );
    return rows[0];
  }

  static async update(id, data) {
    const { nombre, categoria, precio_costo, precio_venta, stock, stock_minimo } = data;

    if (precio_venta && precio_costo && precio_venta < precio_costo) {
      throw new Error('Precio de venta no puede ser menor que costo');
    }

    const updates = [];
    const params = [];
    let paramNum = 1;

    if (nombre) { updates.push(`nombre = $${paramNum++}`); params.push(nombre); }
    if (categoria) { updates.push(`categoria = $${paramNum++}`); params.push(categoria); }
    if (precio_costo) { updates.push(`precio_costo = $${paramNum++}`); params.push(precio_costo); }
    if (precio_venta) { updates.push(`precio_venta = $${paramNum++}`); params.push(precio_venta); }
    if (stock !== undefined) { updates.push(`stock = $${paramNum++}`); params.push(stock); }
    if (stock_minimo) { updates.push(`stock_minimo = $${paramNum++}`); params.push(stock_minimo); }

    if (updates.length === 0) return this.findById(id);

    params.push(id);
    const { rows } = await pool.query(`UPDATE farmacia_productos SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`, params);
    return rows[0];
  }

  static async desactivar(id) {
    await pool.query('UPDATE farmacia_productos SET activo = false WHERE id = $1', [id]);
  }

  static async decrementarStock(id, cantidad) {
    const producto = await this.findById(id);
    if (!producto) throw new Error('Producto no encontrado');
    if (producto.stock < cantidad) throw new Error('Stock insuficiente');

    await pool.query('UPDATE farmacia_productos SET stock = stock - $1 WHERE id = $2', [cantidad, id]);
  }

  static async incrementarStock(id, cantidad) {
    await pool.query('UPDATE farmacia_productos SET stock = stock + $1 WHERE id = $2', [cantidad, id]);
  }
}

module.exports = FarmaciaProducto;
