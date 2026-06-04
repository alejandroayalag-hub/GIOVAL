const pool = require('../db/pool');

const Cita = {
  async findByRango({ desde, hasta }) {
    const { rows } = await pool.query(
      `SELECT c.*, t.nombre AS tratamiento_nombre, t.duracion_min,
              e.nombre AS empleada_nombre, e.apellido_paterno AS empleada_apellido
       FROM citas c
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN empleados e ON e.id = c.empleada_id
       WHERE c.fecha_hora BETWEEN $1 AND $2
       ORDER BY c.fecha_hora`,
      [desde, hasta]
    );
    return rows;
  },

  async create(data) {
    const { nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by } = data;
    const { rows } = await pool.query(
      `INSERT INTO citas (nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by]
    );
    return rows[0];
  },

  async update(id, data) {
    const { nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, estatus } = data;
    const { rows } = await pool.query(
      `UPDATE citas SET
         nombre_paciente = COALESCE($1, nombre_paciente),
         telefono        = COALESCE($2, telefono),
         tratamiento_id  = COALESCE($3, tratamiento_id),
         empleada_id     = COALESCE($4, empleada_id),
         fecha_hora      = COALESCE($5, fecha_hora),
         notas           = COALESCE($6, notas),
         estatus         = COALESCE($7, estatus),
         updated_at      = NOW()
       WHERE id = $8 RETURNING *`,
      [nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, estatus, id]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM citas WHERE id = $1', [id]);
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM citas WHERE id = $1', [id]);
  },
};

module.exports = Cita;
