const FotoCita = require('../models/fotoCita');

module.exports = {
  async getByCita(req, res) {
    try {
      const { cita_id } = req.query;
      if (!cita_id) return res.status(400).json({ error: 'cita_id requerido' });
      const fotos = await FotoCita.findByCita(cita_id);
      res.json(fotos);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async create(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
      const { cita_id, paciente_id, etapa, descripcion } = req.body;
      if (!cita_id || !paciente_id || !etapa) {
        return res.status(400).json({ error: 'cita_id, paciente_id y etapa son requeridos' });
      }
      const archivo = `uploads/fotos-cita/${req.file.filename}`;
      const foto = await FotoCita.create({
        cita_id, paciente_id, etapa, archivo,
        descripcion, creado_por: req.user?.id,
      });
      res.status(201).json(foto);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async remove(req, res) {
    try {
      const foto = await FotoCita.delete(req.params.id);
      if (!foto) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};
