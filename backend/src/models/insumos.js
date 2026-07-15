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

  async update(id, { nombre, proveedor, presentacion, precio_unitario, costo_unidad, stock_minimo, stock_actual, categoria, activo, codigo_barras, contenido_envase }) {
    const { rows } = await pool.query(
      `UPDATE insumos SET
         nombre           = COALESCE($1, nombre),
         proveedor        = COALESCE($2, proveedor),
         presentacion     = COALESCE($3, presentacion),
         precio_unitario  = COALESCE($4, precio_unitario),
         costo_unidad     = COALESCE($5, costo_unidad),
         stock_minimo     = COALESCE($6, stock_minimo),
         stock_actual     = COALESCE($7, stock_actual),
         categoria        = COALESCE($8, categoria),
         activo           = COALESCE($9, activo),
         codigo_barras    = COALESCE($10, codigo_barras),
         contenido_envase = COALESCE($11, contenido_envase),
         actualizado_en   = NOW()
       WHERE id = $12 RETURNING *`,
      [nombre ?? null, proveedor ?? null, presentacion ?? null,
       precio_unitario ?? null, costo_unidad ?? null,
       stock_minimo ?? null, stock_actual ?? null,
       categoria ?? null, activo ?? null,
       codigo_barras ?? null, contenido_envase ?? null, id]
    );
    return rows[0];
  },

  async findByBarcode(codigo) {
    const { rows } = await pool.query('SELECT * FROM insumos WHERE codigo_barras = $1', [codigo]);
    return rows[0] || null;
  },

  // Alta de stock: suma contenido_envase × #envases al balance en unidad base.
  async registrarEntrada(id, envases) {
    const ins = await this.findById(id);
    if (!ins) return null;
    if (ins.contenido_envase == null)
      throw new Error('El insumo no tiene definido el contenido por envase');
    const agregado = parseFloat(ins.contenido_envase) * envases;
    const { rows } = await pool.query(
      `UPDATE insumos SET stock_actual = COALESCE(stock_actual, 0) + $1, actualizado_en = NOW()
       WHERE id = $2 RETURNING *`,
      [agregado, id]
    );
    return rows[0];
  },

  async categorias() {
    const { rows } = await pool.query(
      `SELECT DISTINCT categoria FROM insumos WHERE activo = true ORDER BY categoria`
    );
    return rows.map(r => r.categoria);
  },

  async create({ nombre, categoria, proveedor, presentacion, precio_unitario, costo_unidad, stock_minimo, stock_actual, codigo_barras, contenido_envase }) {
    // Código autogenerado MAN-###. ponytail: MAX+1 basta para un solo admin;
    // si hubiera creación concurrente el UNIQUE de codigo lo rebota (reintentar).
    const { rows: [{ next }] } = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0) + 1 AS next
         FROM insumos WHERE codigo ~ '^MAN-[0-9]+$'`
    );
    const codigo = `MAN-${String(next).padStart(3, '0')}`;
    const { rows } = await pool.query(
      `INSERT INTO insumos (codigo, nombre, categoria, proveedor, presentacion, precio_unitario, costo_unidad, stock_minimo, stock_actual, codigo_barras, contenido_envase)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [codigo, nombre, categoria ?? null, proveedor ?? null, presentacion ?? null,
       precio_unitario ?? 0, costo_unidad ?? 0, stock_minimo ?? 0, stock_actual ?? null,
       codigo_barras ?? null, contenido_envase ?? null]
    );
    return rows[0];
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

  async addItem(kitId, { insumo_id, cantidad, unidad }) {
    const { rows } = await pool.query(
      `INSERT INTO kit_insumo_items (kit_id, insumo_id, cantidad, unidad)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [kitId, insumo_id, cantidad, unidad ?? null]
    );
    return rows[0];
  },

  async removeItem(itemId) {
    await pool.query('DELETE FROM kit_insumo_items WHERE id = $1', [itemId]);
  },
};

const CitaInsumo = {
  // Checklist de consumo: si ya se confirmó devuelve lo guardado (snapshot);
  // si no, propone la receta del kit del tratamiento de la cita.
  async checklist(citaId) {
    const { rows: citas } = await pool.query(
      'SELECT id, tratamiento_id, insumos_confirmados FROM citas WHERE id = $1', [citaId]
    );
    if (!citas[0]) return null;
    const cita = citas[0];

    if (cita.insumos_confirmados) {
      const { rows: items } = await pool.query(`
        SELECT ci.insumo_id, ci.cantidad, ci.costo_unidad,
               i.codigo, i.nombre, i.codigo_barras, i.stock_actual
        FROM cita_insumos ci
        JOIN insumos i ON i.id = ci.insumo_id
        WHERE ci.cita_id = $1
        ORDER BY i.nombre
      `, [citaId]);
      return { confirmado: true, items };
    }

    const { rows: items } = await pool.query(`
      SELECT kii.insumo_id, kii.cantidad, kii.unidad,
             i.codigo, i.nombre, i.codigo_barras, i.costo_unidad, i.stock_actual
      FROM tratamiento_kit tk
      JOIN kit_insumo_items kii ON kii.kit_id = tk.kit_id
      JOIN insumos i ON i.id = kii.insumo_id
      WHERE tk.tratamiento_id = $1
      ORDER BY i.nombre
    `, [cita.tratamiento_id]);
    return { confirmado: false, items };
  },

  // Confirma el consumo real: guarda snapshot de costo y descuenta stock.
  // Stock puede quedar negativo (se permite con alerta en UI, no se bloquea).
  async confirmar(citaId, items, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: citas } = await client.query(
        'SELECT insumos_confirmados FROM citas WHERE id = $1 FOR UPDATE', [citaId]
      );
      if (!citas[0]) { await client.query('ROLLBACK'); return { error: 'not_found' }; }
      if (citas[0].insumos_confirmados) { await client.query('ROLLBACK'); return { error: 'ya_confirmado' }; }

      for (const it of items) {
        await client.query(`
          INSERT INTO cita_insumos (cita_id, insumo_id, cantidad, costo_unidad, creado_por)
          SELECT $1, i.id, $3, COALESCE(i.costo_unidad, 0), $4
          FROM insumos i WHERE i.id = $2
        `, [citaId, it.insumo_id, it.cantidad, userId]);
        await client.query(
          `UPDATE insumos SET stock_actual = COALESCE(stock_actual, 0) - $1, actualizado_en = NOW()
           WHERE id = $2`,
          [it.cantidad, it.insumo_id]
        );
      }

      await client.query(
        'UPDATE citas SET insumos_confirmados = true, updated_at = NOW() WHERE id = $1', [citaId]
      );
      await client.query('COMMIT');
      return { ok: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = { Insumo, Kit, CitaInsumo };
