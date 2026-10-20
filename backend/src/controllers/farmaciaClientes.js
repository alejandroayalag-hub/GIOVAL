// Clientes de farmacia: pacientes de la clínica (solo nombre y teléfono) o clientes externos.
const pool = require('../db/pool');

exports.buscar = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const term = `%${q}%`;
    const { rows } = await pool.query(
      `(SELECT 'paciente' AS tipo, id, trim(concat_ws(' ', nombre, apellido_paterno, apellido_materno)) AS nombre, telefono
        FROM pacientes
        WHERE concat_ws(' ', nombre, apellido_paterno, apellido_materno) ILIKE $1 OR telefono ILIKE $1
        ORDER BY apellido_paterno, nombre LIMIT 8)
       UNION ALL
       (SELECT 'externo', id, nombre, telefono FROM farmacia_clientes
        WHERE nombre ILIKE $1 OR telefono ILIKE $1 ORDER BY nombre LIMIT 8)`,
      [term]);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.crear = async (req, res, next) => {
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const { rows } = await pool.query(
      `INSERT INTO farmacia_clientes (nombre, telefono) VALUES ($1, $2) RETURNING 'externo' AS tipo, id, nombre, telefono`,
      [nombre, (req.body.telefono || '').trim() || null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};
