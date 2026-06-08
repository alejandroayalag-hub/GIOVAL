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
    const {
      apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
      edad, sexo, ocupacion, estado_civil, escolaridad, grupo_etnico,
      telefono, telefono_alterno, email,
      direccion, colonia, ciudad, estado, codigo_postal,
      contacto_emergencia, parentesco_emergencia, telefono_emergencia,
      referido_por, anotaciones, created_by
    } = data;
    const { rows } = await pool.query(
      `INSERT INTO pacientes
         (apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
          edad, sexo, ocupacion, estado_civil, escolaridad, grupo_etnico,
          telefono, telefono_alterno, email,
          direccion, colonia, ciudad, estado, codigo_postal,
          contacto_emergencia, parentesco_emergencia, telefono_emergencia,
          referido_por, anotaciones, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
       edad, sexo, ocupacion, estado_civil, escolaridad, grupo_etnico,
       telefono, telefono_alterno, email,
       direccion, colonia, ciudad, estado, codigo_postal,
       contacto_emergencia, parentesco_emergencia, telefono_emergencia,
       referido_por, anotaciones, created_by]
    );
    return rows[0];
  },

  async update(id, data) {
    const {
      apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
      edad, sexo, ocupacion, estado_civil, escolaridad, grupo_etnico,
      telefono, telefono_alterno, email,
      direccion, colonia, ciudad, estado, codigo_postal,
      contacto_emergencia, parentesco_emergencia, telefono_emergencia,
      referido_por, anotaciones
    } = data;
    const { rows } = await pool.query(
      `UPDATE pacientes SET
         apellido_paterno        = COALESCE($1,  apellido_paterno),
         apellido_materno        = COALESCE($2,  apellido_materno),
         nombre                  = COALESCE($3,  nombre),
         fecha_registro          = COALESCE($4,  fecha_registro),
         fecha_nacimiento        = COALESCE($5,  fecha_nacimiento),
         edad                    = COALESCE($6,  edad),
         sexo                    = COALESCE($7,  sexo),
         ocupacion               = COALESCE($8,  ocupacion),
         estado_civil            = COALESCE($9,  estado_civil),
         escolaridad             = COALESCE($10, escolaridad),
         grupo_etnico            = COALESCE($11, grupo_etnico),
         telefono                = COALESCE($12, telefono),
         telefono_alterno        = COALESCE($13, telefono_alterno),
         email                   = COALESCE($14, email),
         direccion               = COALESCE($15, direccion),
         colonia                 = COALESCE($16, colonia),
         ciudad                  = COALESCE($17, ciudad),
         estado                  = COALESCE($18, estado),
         codigo_postal           = COALESCE($19, codigo_postal),
         contacto_emergencia     = COALESCE($20, contacto_emergencia),
         parentesco_emergencia   = COALESCE($21, parentesco_emergencia),
         telefono_emergencia     = COALESCE($22, telefono_emergencia),
         referido_por            = COALESCE($23, referido_por),
         anotaciones             = COALESCE($24, anotaciones),
         updated_at              = NOW()
       WHERE id = $25 RETURNING *`,
      [apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
       edad, sexo, ocupacion, estado_civil, escolaridad, grupo_etnico,
       telefono, telefono_alterno, email,
       direccion, colonia, ciudad, estado, codigo_postal,
       contacto_emergencia, parentesco_emergencia, telefono_emergencia,
       referido_por, anotaciones, id]
    );
    return rows[0];
  },

  async updateFoto(id, fotoPath) {
    const { rows } = await pool.query(
      'UPDATE pacientes SET foto = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [fotoPath, id]
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM pacientes WHERE id = $1', [id]);
  },
};

module.exports = Paciente;
