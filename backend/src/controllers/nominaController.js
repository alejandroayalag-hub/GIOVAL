const { Nomina } = require('../models/nomina');

exports.list = async (req, res, next) => {
  try { res.json(await Nomina.list(req.query.mes || null)); } catch (err) { next(err); }
};

exports.resumen = async (req, res, next) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    res.json(await Nomina.resumenMes(mes));
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { mes, nombre_rol } = req.body;
    if (!mes || !nombre_rol) return res.status(400).json({ error: 'mes y nombre_rol son requeridos' });
    res.status(201).json(await Nomina.create(req.body));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const row = await Nomina.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Nomina.delete(req.params.id);
    res.json({ mensaje: 'Eliminado' });
  } catch (err) { next(err); }
};
