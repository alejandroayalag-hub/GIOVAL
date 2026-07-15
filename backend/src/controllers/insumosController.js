const { Insumo, Kit, CitaInsumo } = require('../models/insumos');

// ── Insumos ───────────────────────────────────────────────────────────────────

exports.listInsumos = async (req, res, next) => {
  try { res.json(await Insumo.list()); } catch (err) { next(err); }
};

// pg 23505 = unique_violation; en insumos casi siempre es codigo_barras duplicado.
const esBarcodeDuplicado = err => err.code === '23505' && /codigo_barras/.test(err.constraint || err.detail || '');

exports.updateInsumo = async (req, res, next) => {
  try {
    const insumo = await Insumo.update(req.params.id, req.body);
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(insumo);
  } catch (err) {
    if (esBarcodeDuplicado(err)) return res.status(409).json({ error: 'El código de barras ya está asignado a otro insumo' });
    next(err);
  }
};

exports.createInsumo = async (req, res, next) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const insumo = await Insumo.create(req.body);
    res.status(201).json(insumo);
  } catch (err) {
    if (esBarcodeDuplicado(err)) return res.status(409).json({ error: 'El código de barras ya está asignado a otro insumo' });
    next(err);
  }
};

exports.categoriasInsumos = async (req, res, next) => {
  try { res.json(await Insumo.categorias()); } catch (err) { next(err); }
};

exports.getInsumoByBarcode = async (req, res, next) => {
  try {
    const insumo = await Insumo.findByBarcode(req.params.codigo);
    if (!insumo) return res.status(404).json({ error: 'Código de barras no registrado' });
    res.json(insumo);
  } catch (err) { next(err); }
};

exports.entradaInsumo = async (req, res, next) => {
  try {
    const envases = parseInt(req.body.envases);
    if (!envases || envases <= 0) return res.status(400).json({ error: 'envases (>0) requerido' });
    const insumo = await Insumo.registrarEntrada(req.params.id, envases);
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(insumo);
  } catch (err) { next(err); }
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

exports.addKitItem = async (req, res, next) => {
  try {
    const { insumo_id, cantidad } = req.body;
    if (!insumo_id || !cantidad || cantidad <= 0)
      return res.status(400).json({ error: 'insumo_id y cantidad (>0) requeridos' });
    const item = await Kit.addItem(req.params.id, req.body);
    res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.removeKitItem = async (req, res, next) => {
  try {
    await Kit.removeItem(req.params.itemId);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── Consumo por cita (Fase 2) ─────────────────────────────────────────────────

exports.checklistCitaInsumos = async (req, res, next) => {
  try {
    const data = await CitaInsumo.checklist(req.params.id);
    if (!data) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(data);
  } catch (err) { next(err); }
};

exports.confirmarCitaInsumos = async (req, res, next) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'items (no vacío) requerido' });
    for (const it of items) {
      if (!it.insumo_id || !(parseFloat(it.cantidad) > 0))
        return res.status(400).json({ error: 'Cada item requiere insumo_id y cantidad > 0' });
    }
    const result = await CitaInsumo.confirmar(req.params.id, items, req.user.id);
    if (result.error === 'not_found')     return res.status(404).json({ error: 'Cita no encontrada' });
    if (result.error === 'ya_confirmado') return res.status(409).json({ error: 'El consumo de esta cita ya fue confirmado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
