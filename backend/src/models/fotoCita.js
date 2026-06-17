const pool = require('../db/pool');

const FotoCita = {
  async findByCita(citaId) {
    const { rows } = await pool.query(
      `SELECT fc.*, u.nombre as creado_por_nombre
       FROM fotos_cita fc
       LEFT JOIN usuarios u ON u.id = fc.creado_por
       WHERE fc.cita_id = $1
       ORDER BY fc.etapa, fc.created_at`,
      [citaId]
    );
    const grouped = { antes: [], durante: [], despues: [] };
    for (const row of rows) grouped[row.etapa].push(row);
    return grouped;
  },

  async create({ cita_id, paciente_id, etapa, archivo, descripcion, creado_por }) {
    const { rows } = await pool.query(
      `INSERT INTO fotos_cita (cita_id, paciente_id, etapa, archivo, descripcion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [cita_id, paciente_id, etapa, archivo, descripcion || null, creado_por || null]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM fotos_cita WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0];
  },
};

module.exports = FotoCita;
