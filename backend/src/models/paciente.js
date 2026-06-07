const pool = require('../db/pool');

const Paciente = {
  async findAll() {
    const { rows } = await pool.query(
      `SELECT id, apellido_paterno, apellido_materno, nombre, telefono, email,
              fecha_registro, created_at
       FROM pacientes ORDER BY apellido_paterno, apellido_materno, nombre`
    );
    return rows;
  },

  async buscar(q) {
    const term = `%${q}%`;
    const { rows } = await pool.query(
      `SELECT id, apellido_paterno, apellido_materno, nombre, telefono
       FROM pacientes
       WHERE apellido_paterno ILIKE $1 OR apellido_materno ILIKE $1
          OR nombre ILIKE $1 OR telefono ILIKE $1
       ORDER BY apellido_paterno, nombre LIMIT 10`,
      [term]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT p.*,
              json_agg(DISTINCT jsonb_build_object(
                'id', c.id, 'fecha_hora', c.fecha_hora, 'estatus', c.estatus,
                'tratamiento_nombre', t.nombre, 'empleada_nombre', e.nombre
              ) ORDER BY c.fecha_hora DESC) FILTER (WHERE c.id IS NOT NULL) AS citas,
              json_agg(DISTINCT jsonb_build_object(
                'id', nv.id, 'cita_id', nv.cita_id, 'evolucion', nv.evolucion,
                'diagnostico', nv.diagnostico, 'created_at', nv.created_at
              ) ORDER BY nv.created_at DESC) FILTER (WHERE nv.id IS NOT NULL) AS notas
       FROM pacientes p
       LEFT JOIN citas c ON c.paciente_id = p.id
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN empleados e ON e.id = c.empleada_id
       LEFT JOIN notas_visita nv ON nv.paciente_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return rows[0];
  },

  async create(data) {
    const { apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
            edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, created_by } = data;
    const { rows } = await pool.query(
      `INSERT INTO pacientes
         (apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
          edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
       edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, created_by]
    );
    return rows[0];
  },

  async update(id, data) {
    const { apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
            edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones } = data;
    const { rows } = await pool.query(
      `UPDATE pacientes SET
         apellido_paterno = COALESCE($1, apellido_paterno),
         apellido_materno = COALESCE($2, apellido_materno),
         nombre           = COALESCE($3, nombre),
         fecha_registro   = COALESCE($4, fecha_registro),
         fecha_nacimiento = COALESCE($5, fecha_nacimiento),
         edad             = COALESCE($6, edad),
         sexo             = COALESCE($7, sexo),
         ocupacion        = COALESCE($8, ocupacion),
         estado_civil     = COALESCE($9, estado_civil),
         telefono         = COALESCE($10, telefono),
         email            = COALESCE($11, email),
         direccion        = COALESCE($12, direccion),
         anotaciones      = COALESCE($13, anotaciones),
         updated_at       = NOW()
       WHERE id = $14 RETURNING *`,
      [apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
       edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, id]
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM pacientes WHERE id = $1', [id]);
  },
};

module.exports = Paciente;
