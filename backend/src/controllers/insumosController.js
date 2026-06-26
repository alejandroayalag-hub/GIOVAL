const { Insumo, Kit } = require('../models/insumos');

// ── Insumos ───────────────────────────────────────────────────────────────────

exports.listInsumos = async (req, res, next) => {
  try { res.json(await Insumo.list()); } catch (err) { next(err); }
};

exports.updateInsumo = async (req, res, next) => {
  try {
    const insumo = await Insumo.update(req.params.id, req.body);
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(insumo);
  } catch (err) { next(err); }
};

exports.categoriasInsumos = async (req, res, next) => {
  try { res.json(await Insumo.categorias()); } catch (err) { next(err); }
};

// ── Kits ──────────────────────────────────────────────────────────────────────

exports.listKits = async (req, res, next) => {
  try { res.json(await Kit.list()); } catch (err) { next(err); }
};

exports.getKit = async (req, res, next) => {
  try {
    const kit = await Kit.findByIdWithItems(req.params.id);
    if (!kit) return res.status(404).json({ error: 'Kit no encontrado' });
    res.json(kit);
  } catch (err) { next(err); }
};

exports.costoKit = async (req, res, next) => {
  try {
    const costo = await Kit.costoCabina(req.params.id);
    res.json({ kit_id: parseInt(req.params.id), costo_cabina: costo });
  } catch (err) { next(err); }
};

exports.costoCabinaByTratamiento = async (req, res, next) => {
  try {
    const info = await Kit.costoByTratamiento(req.params.id);
    res.json(info ? { tratamiento_id: parseInt(req.params.id), ...info } : { tratamiento_id: parseInt(req.params.id), costo_cabina: 0, kit_id: null, kit_nombre: null });
  } catch (err) { next(err); }
};

exports.updateKitItem = async (req, res, next) => {
  try {
    const item = await Kit.updateItem(req.params.itemId, req.body);
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(item);
  } catch (err) { next(err); }
};
