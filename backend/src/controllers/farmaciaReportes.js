const pool = require('../db/pool');

exports.resumen = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, empleado_id } = req.query;

    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: 'Fechas desde y hasta requeridas' });
    }

    let query = 'SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total_ventas FROM farmacia_ventas WHERE estado = $1 AND DATE(fecha) BETWEEN $2 AND $3';
    const params = ['pagada', fecha_desde, fecha_hasta];

    if (empleado_id) {
      query += ' AND empleado_id = $' + (params.length + 1);
      params.push(empleado_id);
    }

    const { rows } = await pool.query(query, params);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.stockBajo = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM farmacia_productos WHERE activo = true AND stock <= stock_minimo ORDER BY stock ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.topProductos = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, limite } = req.query;
    const limit = parseInt(limite) || 10;
    const params = [];
    let paramNum = 1;

    let query = `
      SELECT
        fp.id, fp.nombre, fp.precio_venta,
        SUM(fiv.cantidad) as cantidad_vendida,
        SUM(fiv.subtotal) as ingresos,
        SUM(fiv.cantidad * fp.precio_costo) as costo
      FROM farmacia_items_venta fiv
      JOIN farmacia_productos fp ON fiv.producto_id = fp.id
      JOIN farmacia_ventas fv ON fiv.venta_id = fv.id
      WHERE fv.estado = $${paramNum++}
    `;

    params.push('pagada');

    if (fecha_desde && fecha_hasta) {
      query += ` AND DATE(fv.fecha) BETWEEN $${paramNum++} AND $${paramNum++}`;
      params.push(fecha_desde, fecha_hasta);
    }

    query += ` GROUP BY fp.id ORDER BY cantidad_vendida DESC LIMIT $${paramNum}`;
    params.push(limit);

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.ganancias = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: 'Fechas desde y hasta requeridas' });
    }

    const { rows: ventasRows } = await pool.query(
      'SELECT id FROM farmacia_ventas WHERE estado = $1 AND DATE(fecha) BETWEEN $2 AND $3',
      ['pagada', fecha_desde, fecha_hasta]
    );

    let total_costo = 0;
    let total_ventas = 0;

    for (const venta of ventasRows) {
      const { rows: itemsRows } = await pool.query(
        'SELECT fiv.*, fp.precio_costo FROM farmacia_items_venta fiv JOIN farmacia_productos fp ON fiv.producto_id = fp.id WHERE fiv.venta_id = $1',
        [venta.id]
      );

      for (const item of itemsRows) {
        total_costo += item.precio_costo * item.cantidad;
      }
    }

    const { rows: totalVentasRows } = await pool.query(
      'SELECT COALESCE(SUM(total), 0) as total FROM farmacia_ventas WHERE estado = $1 AND DATE(fecha) BETWEEN $2 AND $3',
      ['pagada', fecha_desde, fecha_hasta]
    );

    total_ventas = parseFloat(totalVentasRows[0]?.total || 0);

    const ganancia = total_ventas - total_costo;
    const margen = total_ventas > 0 ? ((ganancia / total_ventas) * 100).toFixed(2) : 0;

    res.json({
      total_ingresos: total_ventas,
      total_costo,
      ganancia_neta: ganancia,
      margen_porcentaje: margen
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.ventasPorEmpleado = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const params = [];
    let paramNum = 1;

    let query = `
      SELECT
        u.id, u.nombre,
        COUNT(fv.id) as cantidad_ventas,
        COALESCE(SUM(fv.total), 0) as total_ventas,
        COALESCE(AVG(fv.total), 0) as promedio_venta
      FROM farmacia_ventas fv
      JOIN usuarios u ON fv.empleado_id = u.id
      WHERE fv.estado = $${paramNum++}
    `;

    params.push('pagada');

    if (fecha_desde && fecha_hasta) {
      query += ` AND DATE(fv.fecha) BETWEEN $${paramNum++} AND $${paramNum++}`;
      params.push(fecha_desde, fecha_hasta);
    }

    query += ' GROUP BY u.id ORDER BY total_ventas DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
