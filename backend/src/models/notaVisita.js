const pool = require('../db/pool');

const NotaVisita = {
  async findByCita(citaId) {
    const { rows } = await pool.query(
      'SELECT * FROM notas_visita WHERE cita_id = $1', [citaId]
    );
    return rows[0] || null;
  },

  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT nv.*, c.fecha_hora, c.estatus AS cita_estatus,
              t.nombre AS tratamiento_nombre, u.nombre AS creado_por_nombre
       FROM notas_visita nv
       JOIN citas c ON c.id = nv.cita_id
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN usuarios u ON u.id = nv.created_by
       WHERE nv.paciente_id = $1
       ORDER BY nv.created_at DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create(data) {
    const { cita_id, paciente_id, evolucion, diagnostico, pronostico,
            tratamiento_indicaciones, signos_vitales, tipo = 'medico', created_by } = data;
    const { rows } = await pool.query(
      `INSERT INTO notas_visita
         (cita_id, paciente_id, evolucion, diagnostico, pronostico,
          tratamiento_indicaciones, signos_vitales, tipo, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [cita_id, paciente_id, evolucion, diagnostico, pronostico,
       tratamiento_indicaciones, signos_vitales || {}, tipo, created_by]
    );
    return rows[0];
  },

  async update(id, data) {
    const { evolucion, diagnostico, pronostico, tratamiento_indicaciones, signos_vitales } = data;
    const { rows } = await pool.query(
      `UPDATE notas_visita SET
         evolucion                = COALESCE($1, evolucion),
         diagnostico              = COALESCE($2, diagnostico),
         pronostico               = COALESCE($3, pronostico),
         tratamiento_indicaciones = COALESCE($4, tratamiento_indicaciones),
         signos_vitales           = COALESCE($5, signos_vitales)
       WHERE id = $6 RETURNING *`,
      [evolucion, diagnostico, pronostico, tratamiento_indicaciones, signos_vitales, id]
    );
    return rows[0];
  },

  async remove(id) {
    await pool.query('DELETE FROM notas_visita WHERE id = $1', [id]);
  },
};

module.exports = NotaVisita;
