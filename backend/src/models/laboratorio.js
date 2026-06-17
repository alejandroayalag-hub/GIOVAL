const pool = require('../db/pool');

const Laboratorio = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT l.*, u.nombre as creado_por_nombre
       FROM laboratorios l
       LEFT JOIN usuarios u ON u.id = l.creado_por
       WHERE l.paciente_id = $1
       ORDER BY l.created_at DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create({ paciente_id, nombre, archivo, fecha, notas, creado_por }) {
    const { rows } = await pool.query(
      `INSERT INTO laboratorios (paciente_id, nombre, archivo, fecha, notas, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [paciente_id, nombre, archivo, fecha || null, notas || null, creado_por || null]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM laboratorios WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0];
  },
};

module.exports = Laboratorio;
