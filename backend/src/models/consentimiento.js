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

  async findByCodigo(codigo) {
    const { rows } = await pool.query(
      'SELECT * FROM consentimientos WHERE codigo = $1',
      [codigo]
    );
    return rows[0] || null;
  },

  async upsertGeneral(codigo, data, userId) {
    const { titulo, texto_consentimiento, activo } = data;
    const { rows } = await pool.query(
      `INSERT INTO consentimientos (codigo, titulo, texto_consentimiento, activo, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (codigo) DO UPDATE SET
         titulo = EXCLUDED.titulo,
         texto_consentimiento = EXCLUDED.texto_consentimiento,
         activo = EXCLUDED.activo,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [codigo, titulo, texto_consentimiento, activo ?? true, userId]
    );
    return rows[0];
  },

  async findFirmadosByPaciente(pacienteId) {
    // ine_frente/ine_reverso excluidos del listado (data URLs pesados) — pedir por firmado con findIneByFirmado
    const { rows } = await pool.query(
      `SELECT cf.id, cf.consentimiento_id, cf.paciente_id, cf.cita_id, cf.nombre_paciente,
              cf.tratamiento_nombre, cf.firma_imagen, cf.fecha_firmado, cf.firmado_por, cf.autoriza_fotos,
              cf.ip, cf.user_agent, cf.geo_lat, cf.geo_lng, cf.geo_precision_m,
              (cf.ine_frente IS NOT NULL) AS tiene_ine,
              c.titulo, c.codigo, c.cuidados_post
       FROM consentimientos_firmados cf
       JOIN consentimientos c ON c.id = cf.consentimiento_id
       WHERE cf.paciente_id = $1
       ORDER BY cf.fecha_firmado DESC`,
      [pacienteId]
    );
    return rows;
  },

  async findIneByFirmado(id) {
    const { rows } = await pool.query(
      'SELECT ine_frente, ine_reverso FROM consentimientos_firmados WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async findIneRecienteByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT ine_frente, ine_reverso FROM consentimientos_firmados
       WHERE paciente_id = $1 AND ine_frente IS NOT NULL AND ine_reverso IS NOT NULL
       ORDER BY fecha_firmado DESC LIMIT 1`,
      [pacienteId]
    );
    return rows[0] || null;
  },

  async findFirmadoByCita(citaId) {
    const { rows } = await pool.query(
      `SELECT cf.* FROM consentimientos_firmados cf WHERE cf.cita_id = $1`,
      [citaId]
    );
    return rows[0] || null;
  },

  async createFirmado(data) {
    const { consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por, autoriza_fotos,
            ip, user_agent, geo_lat, geo_lng, geo_precision_m, ine_frente, ine_reverso } = data;
    const { rows } = await pool.query(
      `INSERT INTO consentimientos_firmados
         (consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por, autoriza_fotos,
          ip, user_agent, geo_lat, geo_lng, geo_precision_m, ine_frente, ine_reverso)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, consentimiento_id, paciente_id, cita_id, fecha_firmado`,
      [consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por, autoriza_fotos ?? null,
       ip ?? null, user_agent ?? null, geo_lat ?? null, geo_lng ?? null, geo_precision_m ?? null, ine_frente ?? null, ine_reverso ?? null]
    );
    return rows[0];
  },
};

module.exports = Consentimiento;
