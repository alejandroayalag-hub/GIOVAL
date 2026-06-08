// backend/src/controllers/usuariosController.js
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

const ROLES_PERMITIDOS = ['asistente_medico', 'cosmetista', 'asistente_general'];

exports.list = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, email, rol, cedula_profesional, created_at
       FROM usuarios ORDER BY nombre`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { nombre, email, password, rol, cedula_profesional } = req.body;
    if (!nombre || !email || !password || !rol)
      return res.status(400).json({ error: 'nombre, email, password y rol son requeridos' });
    if (!ROLES_PERMITIDOS.includes(rol))
      return res.status(400).json({ error: `rol debe ser uno de: ${ROLES_PERMITIDOS.join(', ')}` });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol, cedula_profesional)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol, cedula_profesional, created_at`,
      [nombre, email, hash, rol, cedula_profesional || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { nombre, email, password, rol, cedula_profesional } = req.body;
    if (rol && !ROLES_PERMITIDOS.includes(rol))
      return res.status(400).json({ error: `rol debe ser uno de: ${ROLES_PERMITIDOS.join(', ')}` });

    const setClauses = [];
    const values = [];
    let i = 1;

    if (nombre)            { setClauses.push(`nombre = $${i++}`);            values.push(nombre); }
    if (email)             { setClauses.push(`email = $${i++}`);             values.push(email); }
    if (rol)               { setClauses.push(`rol = $${i++}`);               values.push(rol); }
    if (cedula_profesional !== undefined) { setClauses.push(`cedula_profesional = $${i++}`); values.push(cedula_profesional || null); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      setClauses.push(`password = $${i++}`);
      values.push(hash);
    }
    if (setClauses.length === 0)
      return res.status(400).json({ error: 'Nada que actualizar' });

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE usuarios SET ${setClauses.join(', ')}
       WHERE id = $${i} AND rol != 'admin'
       RETURNING id, nombre, email, rol, cedula_profesional, created_at`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado o es admin' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    next(err);
  }
};
