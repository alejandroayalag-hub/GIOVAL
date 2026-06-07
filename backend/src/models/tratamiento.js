const pool = require('../db/pool');

const Tratamiento = {
  async findAll() {
    const { rows } = await pool.query(
      'SELECT * FROM tratamientos ORDER BY orden, nombre'
    );
    return rows;
  },

  async findActivos() {
    const { rows } = await pool.query(
      'SELECT * FROM tratamientos WHERE activo = true ORDER BY orden, nombre'
    );
    return rows;
  },

  async create({ nombre, duracion_min, categoria, subcategoria, orden }) {
    const { rows } = await pool.query(
      'INSERT INTO tratamientos (nombre, duracion_min, categoria, subcategoria, orden) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, duracion_min || 60, categoria || null, subcategoria || null, orden || 0]
    );
    return rows[0];
  },

  async update(id, { nombre, duracion_min, activo, categoria, subcategoria, orden }) {
    const { rows } = await pool.query(
      `UPDATE tratamientos
       SET nombre       = COALESCE($1, nombre),
           duracion_min = COALESCE($2, duracion_min),
           activo       = COALESCE($3, activo),
           categoria    = COALESCE($4, categoria),
           subcategoria = COALESCE($5, subcategoria),
           orden        = COALESCE($6, orden)
       WHERE id = $7 RETURNING *`,
      [nombre, duracion_min, activo, categoria, subcategoria, orden, id]
    );
    return rows[0];
  },
};

module.exports = Tratamiento;
