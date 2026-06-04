const pool = require('../db/pool');

const Tratamiento = {
  async findAll() {
    const { rows } = await pool.query(
      'SELECT * FROM tratamientos ORDER BY nombre'
    );
    return rows;
  },

  async findActivos() {
    const { rows } = await pool.query(
      'SELECT * FROM tratamientos WHERE activo = true ORDER BY nombre'
    );
    return rows;
  },

  async create({ nombre, duracion_min }) {
    const { rows } = await pool.query(
      'INSERT INTO tratamientos (nombre, duracion_min) VALUES ($1, $2) RETURNING *',
      [nombre, duracion_min || 60]
    );
    return rows[0];
  },

  async update(id, { nombre, duracion_min, activo }) {
    const { rows } = await pool.query(
      `UPDATE tratamientos
       SET nombre = COALESCE($1, nombre),
           duracion_min = COALESCE($2, duracion_min),
           activo = COALESCE($3, activo)
       WHERE id = $4 RETURNING *`,
      [nombre, duracion_min, activo, id]
    );
    return rows[0];
  },
};

module.exports = Tratamiento;
