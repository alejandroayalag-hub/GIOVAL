const pool = require('../db/pool');

const Consentimiento = {
  async findByTratamiento(tratamientoId) {
    const { rows } = await pool.query(
      'SELECT * FROM consentimientos WHERE tratamiento_id = $1',
      [tratamientoId]
    );
    return rows[0] || null;
  },

  async upsert(tratamientoId, data, userId) {
    const { titulo, texto_consentimiento, cuidados_pre, cuidados_post, activo } = data;
    const { rows } = await pool.query(
      `INSERT INTO consentimientos (tratamiento_id, titulo, texto_consentimiento, cuidados_pre, cuidados_post, activo, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tratamiento_id) DO UPDATE SET
         titulo = EXCLUDED.titulo,
         texto_consentimiento = EXCLUDED.texto_consentimiento,
         cuidados_pre = EXCLUDED.cuidados_pre,
         cuidados_post = EXCLUDED.cuidados_post,
         activo = EXCLUDED.activo,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [tratamientoId, titulo, texto_consentimiento, cuidados_pre, cuidados_post, activo ?? true, userId]
    );
    return rows[0];
  },

  async findFirmadosByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT cf.*, c.titulo, c.cuidados_post
       FROM consentimientos_firmados cf
       JOIN consentimientos c ON c.id = cf.consentimiento_id
       WHERE cf.paciente_id = $1
       ORDER BY cf.fecha_firmado DESC`,
      [pacienteId]
    );
    return rows;
  },

  async findFirmadoByCita(citaId) {
    const { rows } = await pool.query(
      `SELECT cf.* FROM consentimientos_firmados cf WHERE cf.cita_id = $1`,
      [citaId]
    );
    return rows[0] || null;
  },

  async createFirmado(data) {
    const { consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por } = data;
    const { rows } = await pool.query(
      `INSERT INTO consentimientos_firmados
         (consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por]
    );
    return rows[0];
  },
};

module.exports = Consentimiento;
