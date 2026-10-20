const pool = require('../db/pool');

const METODOS = ['efectivo', 'terminal', 'transferencia'];

class FarmaciaVenta {
  static async findAll(filtros = {}) {
    let query = `SELECT fv.*, u.nombre AS vendedor,
                        COALESCE(NULLIF(trim(concat_ws(' ', pa.nombre, pa.apellido_paterno)), ''), fc.nombre) AS cliente
                 FROM farmacia_ventas fv
                 LEFT JOIN usuarios u ON u.id = fv.empleado_id
                 LEFT JOIN pacientes pa ON pa.id = fv.paciente_id
                 LEFT JOIN farmacia_clientes fc ON fc.id = fv.cliente_id
                 WHERE fv.estado IN ('pagada', 'cancelada')`;
    const params = [];

    if (filtros.empleado_id) {
      params.push(filtros.empleado_id);
      query += ` AND fv.empleado_id = $${params.length}`;
    }
    if (filtros.caja_id) {
      params.push(filtros.caja_id);
      query += ` AND fv.caja_id = $${params.length}`;
    }
    if (filtros.estado) {
      params.push(filtros.estado);
      query += ` AND fv.estado = $${params.length}`;
    }
    if (filtros.fecha_desde && filtros.fecha_hasta) {
      params.push(filtros.fecha_desde, filtros.fecha_hasta);
      query += ` AND DATE(fv.fecha) BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    query += ' ORDER BY fv.fecha DESC LIMIT 500';
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM farmacia_ventas WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async getItems(venta_id) {
    const { rows } = await pool.query(
      `SELECT fiv.*, fp.nombre FROM farmacia_items_venta fiv
       JOIN farmacia_productos fp ON fiv.producto_id = fp.id WHERE fiv.venta_id = $1 ORDER BY fiv.id`,
      [venta_id]
    );
    return rows;
  }

  // Cobro completo en una transacción: o se registra todo (venta + items + stock) o nada.
  static async checkout({ empleado_id, caja_id, items, metodo_pago, paciente_id, cliente_id }) {
    if (!METODOS.includes(metodo_pago)) throw new Error('Método de pago inválido');
    if (!Array.isArray(items) || items.length === 0) throw new Error('Carrito vacío');

    // Junta renglones repetidos del mismo producto
    const cantidades = new Map();
    for (const it of items) {
      const cantidad = Number(it.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida');
      cantidades.set(Number(it.producto_id), (cantidades.get(Number(it.producto_id)) || 0) + cantidad);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // FOR UPDATE: dos ventas simultáneas no pueden vender la misma última pieza
      const { rows: productos } = await client.query(
        'SELECT * FROM farmacia_productos WHERE id = ANY($1::int[]) AND activo = true ORDER BY id FOR UPDATE',
        [[...cantidades.keys()]]
      );
      if (productos.length !== cantidades.size) throw new Error('Producto no encontrado o inactivo');

      let total = 0;
      for (const p of productos) {
        const cantidad = cantidades.get(p.id);
        if (!(parseFloat(p.precio_venta) > 0)) throw new Error(`"${p.nombre}" no tiene precio de venta`);
        if (p.stock < cantidad) throw new Error(`Stock insuficiente de "${p.nombre}" (hay ${p.stock})`);
        total += cantidad * parseFloat(p.precio_venta);
      }
      total = Math.round(total * 100) / 100;

      const { rows: [venta] } = await client.query(
        `INSERT INTO farmacia_ventas (empleado_id, caja_id, estado, fecha, subtotal, total, metodo_pago, paciente_id, cliente_id)
         VALUES ($1, $2, 'pagada', NOW(), $3, $3, $4, $5, $6) RETURNING *`,
        [empleado_id, caja_id, total, metodo_pago, paciente_id || null, paciente_id ? null : (cliente_id || null)]
      );
      for (const p of productos) {
        const cantidad = cantidades.get(p.id);
        await client.query(
          `INSERT INTO farmacia_items_venta (venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [venta.id, p.id, cantidad, p.precio_venta, p.precio_costo, cantidad * parseFloat(p.precio_venta)]
        );
        await client.query('UPDATE farmacia_productos SET stock = stock - $1 WHERE id = $2', [cantidad, p.id]);
      }
      if (venta.cliente_id) await client.query('UPDATE farmacia_clientes SET ultima_compra = NOW() WHERE id = $1', [venta.cliente_id]);
      await client.query('COMMIT');
      return venta;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Cancela una venta pagada y regresa el stock, en una transacción.
  static async cancelar(venta_id, usuario_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [venta] } = await client.query(
        'SELECT * FROM farmacia_ventas WHERE id = $1 FOR UPDATE', [venta_id]
      );
      if (!venta) throw new Error('Venta no encontrada');
      if (venta.estado !== 'pagada') throw new Error('Solo se pueden cancelar ventas pagadas');

      await client.query(
        `UPDATE farmacia_productos p SET stock = p.stock + i.cantidad
         FROM farmacia_items_venta i WHERE i.venta_id = $1 AND i.producto_id = p.id`,
        [venta_id]
      );
      const { rows: [cancelada] } = await client.query(
        `UPDATE farmacia_ventas SET estado = 'cancelada', cancelada_por = $2, cancelada_en = NOW()
         WHERE id = $1 RETURNING *`,
        [venta_id, usuario_id]
      );
      await client.query('COMMIT');
      return cancelada;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = FarmaciaVenta;
