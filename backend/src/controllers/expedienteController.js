// backend/src/controllers/expedienteController.js
const { Cie10, Diagnostico, Receta, NotaMedica, PacienteArchivo } = require('../models/expediente');

// ── CIE-10 ────────────────────────────────────────────────────────────────────
exports.searchCie10 = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    res.json(await Cie10.search(q));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Diagnósticos ──────────────────────────────────────────────────────────────
exports.diagnosticosByPaciente = async (req, res) => {
  try {
    res.json(await Diagnostico.findByPaciente(req.params.pacienteId));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createDiagnostico = async (req, res) => {
  try {
    const { paciente_id, cie10_codigo } = req.body;
    if (!paciente_id || !cie10_codigo)
      return res.status(400).json({ error: 'paciente_id y cie10_codigo son requeridos' });
    const d = await Diagnostico.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(d);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateDiagnostico = async (req, res) => {
  try {
    const d = await Diagnostico.update(req.params.id, req.body);
    if (!d) return res.status(404).json({ error: 'No encontrado' });
    res.json(d);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeDiagnostico = async (req, res) => {
  try {
    await Diagnostico.remove(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Recetas ───────────────────────────────────────────────────────────────────
exports.recetasByPaciente = async (req, res) => {
  try {
    res.json(await Receta.findByPaciente(req.params.pacienteId));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createReceta = async (req, res) => {
  try {
    const { paciente_id, medicamentos } = req.body;
    if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });
    if (!Array.isArray(medicamentos) || medicamentos.length === 0)
      return res.status(400).json({ error: 'Al menos un medicamento requerido' });
    const r = await Receta.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateReceta = async (req, res) => {
  try {
    const r = await Receta.update(req.params.id, req.body);
    if (!r) return res.status(404).json({ error: 'No encontrado' });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeReceta = async (req, res) => {
  try {
    await Receta.remove(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Notas médicas libres ──────────────────────────────────────────────────────
exports.notasByPaciente = async (req, res) => {
  try {
    res.json(await NotaMedica.findByPaciente(req.params.pacienteId));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createNota = async (req, res) => {
  try {
    const { paciente_id, contenido } = req.body;
    if (!paciente_id || !contenido?.trim())
      return res.status(400).json({ error: 'paciente_id y contenido son requeridos' });
    const n = await NotaMedica.create({ paciente_id, contenido: contenido.trim(), created_by: req.user.id });
    res.status(201).json(n);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateNota = async (req, res) => {
  try {
    const { contenido } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ error: 'contenido requerido' });
    const n = await NotaMedica.update(req.params.id, contenido.trim());
    if (!n) return res.status(404).json({ error: 'No encontrado' });
    res.json(n);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeNota = async (req, res) => {
  try {
    await NotaMedica.remove(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Archivos del paciente ─────────────────────────────────────────────────────
const CATEGORIAS = ['foto', 'laboratorio', 'expediente_externo', 'poliza_seguro', 'otro'];
const CATEGORIAS_RECEPCION = ['poliza_seguro', 'otro'];

exports.archivosByPaciente = async (req, res) => {
  try {
    res.json(await PacienteArchivo.findByPaciente(req.params.pacienteId));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createArchivo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const { paciente_id, categoria, nombre, fecha, notas } = req.body;
    if (!paciente_id || !nombre || !CATEGORIAS.includes(categoria))
      return res.status(400).json({ error: 'paciente_id, nombre y categoría válida son requeridos' });
    if (req.user.rol === 'asistente_general' && !CATEGORIAS_RECEPCION.includes(categoria))
      return res.status(403).json({ error: 'Recepción solo puede subir pólizas y documentos administrativos' });
    const a = await PacienteArchivo.create({
      paciente_id, categoria, nombre, fecha, notas,
      archivo: `uploads/expediente/${req.file.filename}`,
      creado_por: req.user.id,
    });
    res.status(201).json(a);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeArchivo = async (req, res) => {
  try {
    const a = await PacienteArchivo.remove(req.params.id);
    if (!a) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
