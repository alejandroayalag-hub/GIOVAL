// backend/src/models/finanzas.js
const pool = require('../db/pool');

const Categoria = {
  async list(soloActivas = false) {
    const where = soloActivas ? 'WHERE activo = true' : '';
    const { rows } = await pool.query(
      `SELECT * FROM categorias_movimiento ${where} ORDER BY tipo, nombre`
    );
    return rows;
  },

  async create({ nombre, tipo, color }) {
    const { rows } = await pool.query(
      `INSERT INTO categorias_movimiento (nombre, tipo, color) VALUES ($1,$2,$3) RETURNING *`,
      [nombre, tipo, color || '#887482']
    );
    return rows[0];
  },

  async update(id, { nombre, tipo, color, activo }) {
    const { rows } = await pool.query(
      `UPDATE categorias_movimiento SET
         nombre = COALESCE($1, nombre),
         tipo   = COALESCE($2, tipo),
         color  = COALESCE($3, color),
         activo = COALESCE($4, activo)
       WHERE id = $5 RETURNING *`,
      [nombre ?? null, tipo ?? null, color ?? null, activo ?? null, id]
    );
    return rows[0];
  },

  async tieneMovimientos(id) {
    const { rows } = await pool.query(
      'SELECT 1 FROM movimientos WHERE categoria_id = $1 LIMIT 1', [id]
    );
    return rows.length > 0;
  },

  async delete(id) {
    await pool.query('DELETE FROM categorias_movimiento WHERE id = $1', [id]);
  },
};

const Movimiento = {
  async list({ tipo, categoria_id, fecha_inicio, fecha_fin, forma_pago } = {}) {
    const conds = []; const vals = []; let i = 1;
    if (tipo)         { conds.push(`m.tipo = $${i++}`);          vals.push(tipo); }
    if (categoria_id) { conds.push(`m.categoria_id = $${i++}`);  vals.push(categoria_id); }
    if (fecha_inicio) { conds.push(`m.fecha >= $${i++}`);        vals.push(fecha_inicio); }
    if (fecha_fin)    { conds.push(`m.fecha <= $${i++}`);        vals.push(fecha_fin); }
    if (forma_pago)   { conds.push(`m.forma_pago = $${i++}`);    vals.push(forma_pago); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT m.*, c.nombre AS categoria_nombre, c.color AS categoria_color,
              u.nombre AS creado_por_nombre
       FROM movimientos m
       LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
       LEFT JOIN usuarios u ON u.id = m.created_by
       ${where}
       ORDER BY m.fecha DESC, m.created_at DESC`,
      vals
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM movimientos WHERE id = $1', [id]);
    return rows[0];
  },

  async create({ tipo, categoria_id, concepto, monto, forma_pago, fecha, notas, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO movimientos (tipo, categoria_id, concepto, monto, forma_pago, fecha, notas, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tipo, categoria_id || null, concepto, monto,
       forma_pago || 'efectivo',
       fecha || new Date().toISOString().split('T')[0],
       notas || null, created_by]
    );
    return rows[0];
  },

  async update(id, { categoria_id, concepto, monto, forma_pago, fecha, notas }) {
    const { rows } = await pool.query(
      `UPDATE movimientos SET
         categoria_id = COALESCE($1, categoria_id),
         concepto     = COALESCE($2, concepto),
         monto        = COALESCE($3, monto),
         forma_pago   = COALESCE($4, forma_pago),
         fecha        = COALESCE($5, fecha),
         notas        = COALESCE($6, notas),
         updated_at   = NOW()
       WHERE id = $7 RETURNING *`,
      [categoria_id ?? null, concepto ?? null, monto ?? null,
       forma_pago ?? null, fecha ?? null, notas ?? null, id]
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM movimientos WHERE id = $1', [id]);
  },

  async resumenPorCategoria({ fecha_inicio, fecha_fin }) {
    const { rows } = await pool.query(
      `SELECT m.tipo, c.nombre AS categoria, c.color,
              COUNT(*) AS cantidad, SUM(m.monto) AS total
       FROM movimientos m
       LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
       WHERE m.fecha >= $1 AND m.fecha <= $2
       GROUP BY m.tipo, c.nombre, c.color
       ORDER BY m.tipo, total DESC`,
      [fecha_inicio, fecha_fin]
    );
    return rows;
  },

  async resumenPorMes({ fecha_inicio, fecha_fin }) {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes,
              SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos,
              SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END) AS egresos
       FROM movimientos
       WHERE fecha >= $1 AND fecha <= $2
       GROUP BY mes ORDER BY mes`,
      [fecha_inicio, fecha_fin]
    );
    return rows;
  },
};

const CorteCaja = {
  async calcularHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0) AS total_ingresos,
         COALESCE(SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END),0) AS total_egresos
       FROM movimientos WHERE fecha = $1`,
      [hoy]
    );
    const ti = parseFloat(rows[0].total_ingresos);
    const te = parseFloat(rows[0].total_egresos);
    return { fecha: hoy, total_ingresos: ti, total_egresos: te, saldo: ti - te };
  },

  async estaCerrado(fecha) {
    const { rows } = await pool.query(
      'SELECT id FROM cortes_caja WHERE fecha = $1', [fecha]
    );
    return rows.length > 0;
  },

  async cerrar({ notas, cerrado_por }) {
    const resumen = await CorteCaja.calcularHoy();
    const { rows } = await pool.query(
      `INSERT INTO cortes_caja (fecha, total_ingresos, total_egresos, saldo, notas, cerrado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [resumen.fecha, resumen.total_ingresos, resumen.total_egresos,
       resumen.saldo, notas || null, cerrado_por]
    );
    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT cc.*, u.nombre AS cerrado_por_nombre
       FROM cortes_caja cc
       LEFT JOIN usuarios u ON u.id = cc.cerrado_por
       ORDER BY cc.fecha DESC`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT cc.*, u.nombre AS cerrado_por_nombre
       FROM cortes_caja cc LEFT JOIN usuarios u ON u.id = cc.cerrado_por
       WHERE cc.id = $1`,
      [id]
    );
    return rows[0];
  },
};

module.exports = { Categoria, Movimiento, CorteCaja };
