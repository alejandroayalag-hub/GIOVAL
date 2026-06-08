// backend/src/controllers/notasVisitaController.js
const NotaVisita = require('../models/notaVisita');

function tipoSegunRol(rol, tipoEnviado) {
  if (rol === 'cosmetista') return 'cosmetico';
  if (rol === 'asistente_medico') return 'medico';
  return tipoEnviado || 'medico';
}

exports.getByCita = async (req, res, next) => {
  try {
    const nota = await NotaVisita.findByCita(req.query.cita_id);
    res.json(nota || null);
  } catch (err) { next(err); }
};

exports.getByPaciente = async (req, res, next) => {
  try {
    const notas = await NotaVisita.findByPaciente(req.params.pacienteId);
    // cosmetista solo ve sus notas tipo cosmetico
    if (req.user.rol === 'cosmetista') {
      return res.json(notas.filter(n => n.tipo === 'cosmetico'));
    }
    res.json(notas);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { cita_id, paciente_id } = req.body;
    if (!cita_id || !paciente_id)
      return res.status(400).json({ error: 'cita_id y paciente_id son requeridos' });
    const tipo = tipoSegunRol(req.user.rol, req.body.tipo);
    const nota = await NotaVisita.create({
      ...req.body, tipo, created_by: req.user.id,
    });
    res.status(201).json(nota);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const nota = await NotaVisita.update(req.params.id, req.body);
    res.json(nota);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await NotaVisita.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
