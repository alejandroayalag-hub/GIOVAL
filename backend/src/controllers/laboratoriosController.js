const Laboratorio = require('../models/laboratorio');

module.exports = {
  async getByPaciente(req, res) {
    try {
      const { paciente_id } = req.query;
      if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });
      const labs = await Laboratorio.findByPaciente(paciente_id);
      res.json(labs);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async create(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
      const { paciente_id, nombre, fecha, notas } = req.body;
      if (!paciente_id || !nombre) {
        return res.status(400).json({ error: 'paciente_id y nombre son requeridos' });
      }
      const archivo = `uploads/laboratorios/${req.file.filename}`;
      const lab = await Laboratorio.create({
        paciente_id, nombre, archivo, fecha, notas,
        creado_por: req.user?.id,
      });
      res.status(201).json(lab);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async remove(req, res) {
    try {
      const lab = await Laboratorio.delete(req.params.id);
      if (!lab) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};
