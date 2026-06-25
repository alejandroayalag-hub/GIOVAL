const { CuentaPorPagar } = require('../models/cuentasPorPagar');

exports.list = async (req, res, next) => {
  try { res.json(await CuentaPorPagar.list({ estatus: req.query.estatus })); } catch (err) { next(err); }
};

exports.resumen = async (req, res, next) => {
  try { res.json(await CuentaPorPagar.resumen()); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    if (!req.body.concepto || !req.body.importe_total)
      return res.status(400).json({ error: 'concepto e importe_total son requeridos' });
    res.status(201).json(await CuentaPorPagar.create(req.body));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const row = await CuentaPorPagar.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const row = await CuentaPorPagar.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    await CuentaPorPagar.delete(req.params.id);
    res.json({ mensaje: 'Eliminado' });
  } catch (err) { next(err); }
};
