const DocClinico = require('../models/documentoClinico');

module.exports = {
  async getByPaciente(req, res) {
    try {
      const docs = await DocClinico.findByPaciente(req.params.pacienteId);
      res.json(docs);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async getByTipo(req, res) {
    try {
      const docs = await DocClinico.findByTipo(req.params.pacienteId, req.params.tipo);
      res.json(docs);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async create(req, res) {
    try {
      const { paciente_id, tipo, fecha, datos } = req.body;
      const doc = await DocClinico.create({
        paciente_id, tipo, fecha, datos,
        creado_por: req.user?.id,
      });
      res.status(201).json(doc);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async update(req, res) {
    try {
      const { datos, fecha } = req.body;
      const doc = await DocClinico.update(req.params.id, { datos, fecha });
      if (!doc) return res.status(404).json({ error: 'No encontrado' });
      res.json(doc);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async remove(req, res) {
    try {
      const doc = await DocClinico.delete(req.params.id);
      if (!doc) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};
