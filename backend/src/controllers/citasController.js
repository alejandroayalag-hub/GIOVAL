const Cita = require('../models/cita');

exports.list = async (req, res, next) => {
  try {
    const { desde, hasta, fecha } = req.query;
    let d, h;
    if (fecha) {
      d = `${fecha}T00:00:00`;
      h = `${fecha}T23:59:59`;
    } else if (desde && hasta) {
      d = `${desde}T00:00:00`;
      h = `${hasta}T23:59:59`;
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      d = `${hoy}T00:00:00`;
      h = `${hoy}T23:59:59`;
    }
    const citas = await Cita.findByRango({ desde: d, hasta: h });
    res.json(citas);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas } = req.body;
    if (!nombre_paciente || !fecha_hora) {
      return res.status(400).json({ error: 'nombre_paciente y fecha_hora son requeridos' });
    }
    const cita = await Cita.create({ nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by: req.user.id });
    res.status(201).json(cita);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await Cita.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cita no encontrada' });

    if (existing.estatus === 'realizada' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No puedes editar una cita ya realizada' });
    }

    const cita = await Cita.update(req.params.id, req.body);
    res.json(cita);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await Cita.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cita no encontrada' });

    if (existing.estatus === 'realizada' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admin puede eliminar citas realizadas' });
    }

    await Cita.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
