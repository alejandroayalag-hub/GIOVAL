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
        (SELECT json_agg(row_to_json(cs) ORDER BY cs.fecha_hora DESC)
         FROM (
           SELECT c.id, c.fecha_hora, c.estatus,
                  t.nombre AS tratamiento_nombre, e.nombre AS empleada_nombre
           FROM citas c
           LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
           LEFT JOIN empleados e ON e.id = c.empleada_id
           WHERE c.paciente_id = p.id
         ) cs) AS citas,
        (SELECT json_agg(row_to_json(ns) ORDER BY ns.created_at DESC)
         FROM (
           SELECT nv.id, nv.cita_id, nv.evolucion, nv.diagnostico, nv.created_at
           FROM notas_visita nv
           WHERE nv.paciente_id = p.id
         ) ns) AS notas
       FROM pacientes p
       WHERE p.id = $1`,
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
