const HistoriaClinica = require('../models/historiaClinica');

exports.get = async (req, res, next) => {
  try {
    const historia = await HistoriaClinica.findByPaciente(req.params.pacienteId);
    if (!historia) return res.status(404).json({ error: 'Historia clínica no encontrada' });
    res.json(historia);
  } catch (err) { next(err); }
};

exports.save = async (req, res, next) => {
  try {
    const historia = await HistoriaClinica.upsert(
      req.params.pacienteId, req.body, req.user.id
    );
    res.json(historia);
  } catch (err) { next(err); }
};
