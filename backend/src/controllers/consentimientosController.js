const Consentimiento = require('../models/consentimiento');

exports.getByTratamiento = async (req, res, next) => {
  try {
    const data = await Consentimiento.findByTratamiento(req.params.tratamientoId);
    res.json(data || {});
  } catch (e) { next(e); }
};

exports.save = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const data = await Consentimiento.upsert(req.params.tratamientoId, req.body, req.user.id);
    res.json(data);
  } catch (e) { next(e); }
};

exports.getByCodigo = async (req, res, next) => {
  try {
    const data = await Consentimiento.findByCodigo(req.params.codigo);
    res.json(data || {});
  } catch (e) { next(e); }
};

exports.saveGeneral = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const data = await Consentimiento.upsertGeneral(req.params.codigo, req.body, req.user.id);
    res.json(data);
  } catch (e) { next(e); }
};

exports.getFirmadosByPaciente = async (req, res, next) => {
  try {
    const data = await Consentimiento.findFirmadosByPaciente(req.params.pacienteId);
    res.json(data);
  } catch (e) { next(e); }
};

exports.getFirmadoByCita = async (req, res, next) => {
  try {
    const data = await Consentimiento.findFirmadoByCita(req.params.citaId);
    res.json(data || null);
  } catch (e) { next(e); }
};

exports.firmar = async (req, res, next) => {
  try {
    const { consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, autoriza_fotos } = req.body;
    if (!firma_imagen || !consentimiento_id || !paciente_id || !nombre_paciente) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    const data = await Consentimiento.createFirmado({
      consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre,
      firma_imagen, firmado_por: req.user.id, autoriza_fotos
    });
    res.status(201).json(data);
  } catch (e) { next(e); }
};
