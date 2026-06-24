const pool = require('../db/pool');

exports.list = async (req, res, next) => {
  try {
    const soloActivos = req.user.rol !== 'admin';
    const where = soloActivos ? 'WHERE activo = true' : '';
    const { rows } = await pool.query(
      `SELECT * FROM consultorios ${where} ORDER BY orden, nombre`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const { nombre, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    const { rows } = await pool.query(
      'INSERT INTO consultorios (nombre, orden) VALUES ($1, $2) RETURNING *',
      [nombre, orden || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const { nombre, activo, orden } = req.body;
    const { rows } = await pool.query(
      `UPDATE consultorios SET
         nombre = COALESCE($1, nombre),
         activo = COALESCE($2, activo),
         orden  = COALESCE($3, orden)
       WHERE id = $4 RETURNING *`,
      [nombre ?? null, activo ?? null, orden ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};
