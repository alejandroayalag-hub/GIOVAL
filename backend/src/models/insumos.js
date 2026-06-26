const pool = require('../db/pool');

const Insumo = {
  async list() {
    const { rows } = await pool.query(
      `SELECT * FROM insumos ORDER BY categoria, nombre`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM insumos WHERE id = $1', [id]);
    return rows[0];
  },

  async update(id, { nombre, proveedor, presentacion, precio_unitario, costo_unidad, stock_minimo, stock_actual, categoria, activo }) {
    const { rows } = await pool.query(
      `UPDATE insumos SET
         nombre          = COALESCE($1, nombre),
         proveedor       = COALESCE($2, proveedor),
         presentacion    = COALESCE($3, presentacion),
         precio_unitario = COALESCE($4, precio_unitario),
         costo_unidad    = COALESCE($5, costo_unidad),
         stock_minimo    = COALESCE($6, stock_minimo),
         stock_actual    = COALESCE($7, stock_actual),
         categoria       = COALESCE($8, categoria),
         activo          = COALESCE($9, activo),
         actualizado_en  = NOW()
       WHERE id = $10 RETURNING *`,
      [nombre ?? null, proveedor ?? null, presentacion ?? null,
       precio_unitario ?? null, costo_unidad ?? null,
       stock_minimo ?? null, stock_actual ?? null,
       categoria ?? null, activo ?? null, id]
    );
    return rows[0];
  },

  async categorias() {
    const { rows } = await pool.query(
      `SELECT DISTINCT categoria FROM insumos WHERE activo = true ORDER BY categoria`
    );
    return rows.map(r => r.categoria);
  },
};

const Kit = {
  async list() {
    const { rows } = await pool.query(`
      SELECT k.id, k.nombre, k.activo,
             COALESCE(SUM(kii.cantidad * i.costo_unidad), 0)::numeric AS costo_cabina
      FROM kits_insumos k
      LEFT JOIN kit_insumo_items kii ON kii.kit_id = k.id
      LEFT JOIN insumos i ON i.id = kii.insumo_id
      GROUP BY k.id, k.nombre, k.activo
      ORDER BY k.nombre
    `);
    return rows;
  },

  async findByIdWithItems(id) {
    const { rows: kit } = await pool.query(
      'SELECT * FROM kits_insumos WHERE id = $1', [id]
    );
    if (!kit[0]) return null;

    const { rows: items } = await pool.query(`
      SELECT kii.id, kii.insumo_id, i.codigo, i.nombre, kii.cantidad, kii.unidad,
             i.costo_unidad::numeric AS costo_unidad,
             (kii.cantidad * i.costo_unidad)::numeric AS costo_sesion
      FROM kit_insumo_items kii
      JOIN insumos i ON i.id = kii.insumo_id
      WHERE kii.kit_id = $1
      ORDER BY i.categoria, i.nombre
    `, [id]);

    const costo_cabina = items.reduce((s, it) => s + parseFloat(it.costo_sesion), 0);
    return { ...kit[0], items, costo_cabina: +costo_cabina.toFixed(4) };
  },

  async costoCabina(kitId) {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(kii.cantidad * i.costo_unidad), 0)::numeric AS costo_cabina
      FROM kit_insumo_items kii
      JOIN insumos i ON i.id = kii.insumo_id
      WHERE kii.kit_id = $1
    `, [kitId]);
    return parseFloat(rows[0].costo_cabina);
  },

  async costoByTratamiento(tratamientoId) {
    const { rows } = await pool.query(`
      SELECT tk.kit_id, k.nombre AS kit_nombre,
             COALESCE(SUM(kii.cantidad * i.costo_unidad), 0)::numeric AS costo_cabina
      FROM tratamiento_kit tk
      JOIN kits_insumos k ON k.id = tk.kit_id
      LEFT JOIN kit_insumo_items kii ON kii.kit_id = tk.kit_id
      LEFT JOIN insumos i ON i.id = kii.insumo_id
      WHERE tk.tratamiento_id = $1
      GROUP BY tk.kit_id, k.nombre
    `, [tratamientoId]);
    if (rows[0]) rows[0].costo_cabina = parseFloat(rows[0].costo_cabina);
    return rows[0] || null;
  },

  async updateItem(itemId, { cantidad }) {
    const { rows } = await pool.query(
      `UPDATE kit_insumo_items SET cantidad = $1 WHERE id = $2 RETURNING *`,
      [cantidad, itemId]
    );
    return rows[0];
  },
};

module.exports = { Insumo, Kit };
