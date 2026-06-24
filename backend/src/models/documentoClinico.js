const pool = require('../db/pool');

const DocumentoClinico = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT dc.*, u.nombre as creado_por_nombre
       FROM documentos_clinicos dc
       LEFT JOIN usuarios u ON u.id = dc.creado_por
       WHERE dc.paciente_id = $1
       ORDER BY dc.tipo, dc.fecha DESC`,
      [pacienteId]
    );
    return rows;
  },

  async findByTipo(pacienteId, tipo) {
    const { rows } = await pool.query(
      `SELECT dc.*, u.nombre as creado_por_nombre
       FROM documentos_clinicos dc
       LEFT JOIN usuarios u ON u.id = dc.creado_por
       WHERE dc.paciente_id = $1 AND dc.tipo = $2
       ORDER BY dc.fecha DESC`,
      [pacienteId, tipo]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM documentos_clinicos WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ paciente_id, tipo, fecha, datos, creado_por }) {
    const { rows } = await pool.query(
      `INSERT INTO documentos_clinicos (paciente_id, tipo, fecha, datos, creado_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [paciente_id, tipo, fecha || new Date().toISOString().slice(0, 10), JSON.stringify(datos || {}), creado_por]
    );
    return rows[0];
  },

  async update(id, { datos, fecha }) {
    const { rows } = await pool.query(
      `UPDATE documentos_clinicos
       SET datos = $1, fecha = COALESCE($2, fecha), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [JSON.stringify(datos || {}), fecha, id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM documentos_clinicos WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0];
  },
};

module.exports = DocumentoClinico;
