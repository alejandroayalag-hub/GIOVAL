const NotaVisita = require('../models/notaVisita');

exports.getByCita = async (req, res, next) => {
  try {
    const nota = await NotaVisita.findByCita(req.query.cita_id);
    res.json(nota || null);
  } catch (err) { next(err); }
};

exports.getByPaciente = async (req, res, next) => {
  try {
    const notas = await NotaVisita.findByPaciente(req.params.pacienteId);
    res.json(notas);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { cita_id, paciente_id } = req.body;
    if (!cita_id || !paciente_id) {
      return res.status(400).json({ error: 'cita_id y paciente_id son requeridos' });
    }
    const nota = await NotaVisita.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(nota);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const nota = await NotaVisita.update(req.params.id, req.body);
    res.json(nota);
  } catch (err) { next(err); }
};
