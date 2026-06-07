const Paciente = require('../models/paciente');
const pool = require('../db/pool');

exports.list = async (req, res, next) => {
  try {
    const pacientes = await Paciente.findAll();
    res.json(pacientes);
  } catch (err) { next(err); }
};

exports.buscar = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const resultados = await Paciente.buscar(q);
    res.json(resultados);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { apellido_paterno, nombre } = req.body;
    if (!apellido_paterno || !nombre) {
      return res.status(400).json({ error: 'apellido_paterno y nombre son requeridos' });
    }
    const paciente = await Paciente.create({ ...req.body, created_by: req.user.id });
    // Create empty historia clinica
    await pool.query(
      'INSERT INTO historias_clinicas (paciente_id, created_by) VALUES ($1, $2)',
      [paciente.id, req.user.id]
    );
    res.status(201).json(paciente);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const paciente = await Paciente.update(req.params.id, req.body);
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admin puede eliminar pacientes' });
    }
    await Paciente.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
