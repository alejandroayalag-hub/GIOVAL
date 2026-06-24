const Tratamiento = require('../models/tratamiento');

exports.list = async (req, res, next) => {
  try {
    const items = await Tratamiento.findAll();
    res.json(items);
  } catch (err) { next(err); }
};

exports.listActivos = async (req, res, next) => {
  try {
    const items = await Tratamiento.findActivos();
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear tratamientos' });
    const { nombre, duracion_min } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    const item = await Tratamiento.create({ nombre, duracion_min });
    res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede editar tratamientos' });
    const item = await Tratamiento.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (err) { next(err); }
};

exports.updatePrecio = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede editar precios' });
    const pool = require('../db/pool');
    const { precio } = req.body;
    const { rows } = await pool.query(
      'UPDATE tratamientos SET precio = $1 WHERE id = $2 RETURNING *',
      [precio !== undefined ? precio : null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};
