// backend/src/models/expediente.js
// Diagnósticos CIE-10, recetas, notas médicas libres y archivos del paciente
const pool = require('../db/pool');

const Cie10 = {
  async search(q) {
    const { rows } = await pool.query(
      `SELECT codigo, descripcion FROM cie10_catalogo
       WHERE codigo ILIKE $1 OR descripcion ILIKE $2
       ORDER BY codigo LIMIT 20`,
      [`${q}%`, `%${q}%`]
    );
    return rows;
  },
};

const Diagnostico = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT d.*, c.descripcion AS cie10_descripcion, u.nombre AS creado_por_nombre
       FROM paciente_diagnosticos d
       JOIN cie10_catalogo c ON c.codigo = d.cie10_codigo
       LEFT JOIN usuarios u ON u.id = d.created_by
       WHERE d.paciente_id = $1
       ORDER BY d.estatus ASC, d.fecha DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create({ paciente_id, cie10_codigo, fecha, notas, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO paciente_diagnosticos (paciente_id, cie10_codigo, fecha, notas, created_by)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5) RETURNING *`,
      [paciente_id, cie10_codigo, fecha, notas, created_by]
    );
    return rows[0];
  },

  async update(id, { estatus, notas }) {
    const { rows } = await pool.query(
      `UPDATE paciente_diagnosticos SET
         estatus = COALESCE($1, estatus),
         notas   = COALESCE($2, notas)
       WHERE id = $3 RETURNING *`,
      [estatus, notas, id]
    );
    return rows[0];
  },

  async remove(id) {
    await pool.query('DELETE FROM paciente_diagnosticos WHERE id = $1', [id]);
  },
};

const Receta = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT r.*, d.cie10_codigo, c.descripcion AS cie10_descripcion,
              u.nombre AS medico_nombre, u.cedula_profesional
       FROM recetas r
       LEFT JOIN paciente_diagnosticos d ON d.id = r.diagnostico_id
       LEFT JOIN cie10_catalogo c ON c.codigo = d.cie10_codigo
       LEFT JOIN usuarios u ON u.id = r.created_by
       WHERE r.paciente_id = $1
       ORDER BY r.created_at DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create({ paciente_id, diagnostico_id, fecha, medicamentos, indicaciones, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO recetas (paciente_id, diagnostico_id, fecha, medicamentos, indicaciones, created_by)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, $6) RETURNING *`,
      [paciente_id, diagnostico_id || null, fecha, JSON.stringify(medicamentos || []), indicaciones, created_by]
    );
    return rows[0];
  },

  async update(id, { diagnostico_id, fecha, medicamentos, indicaciones }) {
    const { rows } = await pool.query(
      `UPDATE recetas SET
         diagnostico_id = $1,
         fecha          = COALESCE($2, fecha),
         medicamentos   = COALESCE($3, medicamentos),
         indicaciones   = COALESCE($4, indicaciones)
       WHERE id = $5 RETURNING *`,
      [diagnostico_id || null, fecha, medicamentos ? JSON.stringify(medicamentos) : null, indicaciones, id]
    );
    return rows[0];
  },

  async remove(id) {
    await pool.query('DELETE FROM recetas WHERE id = $1', [id]);
  },
};

const NotaMedica = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT n.*, u.nombre AS creado_por_nombre
       FROM notas_medicas n
       LEFT JOIN usuarios u ON u.id = n.created_by
       WHERE n.paciente_id = $1
       ORDER BY n.created_at DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create({ paciente_id, contenido, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO notas_medicas (paciente_id, contenido, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [paciente_id, contenido, created_by]
    );
    return rows[0];
  },

  async update(id, contenido) {
    const { rows } = await pool.query(
      `UPDATE notas_medicas SET contenido = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [contenido, id]
    );
    return rows[0];
  },

  async remove(id) {
    await pool.query('DELETE FROM notas_medicas WHERE id = $1', [id]);
  },
};

const PacienteArchivo = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT a.*, u.nombre AS creado_por_nombre
       FROM paciente_archivos a
       LEFT JOIN usuarios u ON u.id = a.creado_por
       WHERE a.paciente_id = $1
       ORDER BY a.created_at DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create({ paciente_id, categoria, nombre, archivo, fecha, notas, creado_por }) {
    const { rows } = await pool.query(
      `INSERT INTO paciente_archivos (paciente_id, categoria, nombre, archivo, fecha, notas, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [paciente_id, categoria, nombre, archivo, fecha || null, notas, creado_por]
    );
    return rows[0];
  },

  async remove(id) {
    const { rows } = await pool.query('DELETE FROM paciente_archivos WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },
};

module.exports = { Cie10, Diagnostico, Receta, NotaMedica, PacienteArchivo };
