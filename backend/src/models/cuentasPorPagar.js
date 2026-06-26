const pool = require('../db/pool');

const CuentaPorPagar = {
  async list({ estatus } = {}) {
    const where = estatus ? 'WHERE c.estatus = $1' : '';
    const vals  = estatus ? [estatus] : [];
    const { rows } = await pool.query(
      `SELECT c.*,
              (c.importe_total - c.pagado)::numeric AS saldo_pendiente,
              fp.nombre AS proveedor_real
       FROM cuentas_por_pagar c
       LEFT JOIN farmacia_proveedores fp ON fp.id = c.proveedor_id
       ${where}
       ORDER BY c.estatus, c.fecha_vencimiento ASC NULLS LAST`,
      vals
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM cuentas_por_pagar WHERE id = $1', [id]);
    return rows[0];
  },

  async create({ folio_factura, proveedor_id, proveedor_nombre, concepto, fecha_factura, fecha_vencimiento, importe_total, pagado, estatus, forma_pago, observaciones }) {
    const { rows } = await pool.query(
      `INSERT INTO cuentas_por_pagar
         (folio_factura, proveedor_id, proveedor_nombre, concepto, fecha_factura, fecha_vencimiento, importe_total, pagado, estatus, forma_pago, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [folio_factura || null, proveedor_id || null, proveedor_nombre || null,
       concepto, fecha_factura || null, fecha_vencimiento || null,
       importe_total, pagado || 0,
       estatus || 'pendiente', forma_pago || null, observaciones || null]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['folio_factura','proveedor_id','proveedor_nombre','concepto','fecha_factura','fecha_vencimiento','importe_total','pagado','estatus','forma_pago','observaciones'];
    const sets = []; const vals = []; let i = 1;
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(fields[k]); }
    }
    if (sets.length) { sets.push(`updated_at = NOW()`); }
    if (!sets.length) return await CuentaPorPagar.findById(id);
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE cuentas_por_pagar SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM cuentas_por_pagar WHERE id = $1', [id]);
  },

  async resumen() {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN estatus != 'liquidada' THEN importe_total - pagado ELSE 0 END), 0)::numeric AS total_pendiente,
        COUNT(CASE WHEN estatus = 'pendiente' THEN 1 END)::integer AS count_pendiente,
        COUNT(CASE WHEN estatus = 'parcial'   THEN 1 END)::integer AS count_parcial,
        COUNT(CASE WHEN estatus = 'liquidada' THEN 1 END)::integer AS count_liquidada,
        COUNT(CASE WHEN fecha_vencimiento < CURRENT_DATE AND estatus != 'liquidada' THEN 1 END)::integer AS count_vencidas
      FROM cuentas_por_pagar
    `);
    return rows[0];
  },
};

module.exports = { CuentaPorPagar };
