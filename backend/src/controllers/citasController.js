const Cita = require('../models/cita');
const pool = require('../db/pool');
const gc   = require('../services/googleCalendar');

// Enriquece la cita con datos de tratamiento y empleada para el evento de Google
async function citaConDetalle(id) {
  const { rows } = await pool.query(
    `SELECT c.*, t.nombre AS tratamiento_nombre, t.duracion_min AS trat_duracion,
            e.nombre AS empleada_nombre
     FROM citas c
     LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
     LEFT JOIN empleados e ON e.id = c.empleada_id
     WHERE c.id = $1`, [id]
  );
  return rows[0];
}

// Push a Google Calendar en background (no bloquea la respuesta)
async function syncToGoogle(citaId) {
  if (!gc.isConfigured()) return;
  try {
    const cita = await citaConDetalle(citaId);
    if (!cita) return;
    const result = await gc.pushCita(cita);
    if (result.eventId && result.eventId !== cita.google_event_id) {
      await pool.query(
        'UPDATE citas SET google_event_id = $1, synced_at = NOW() WHERE id = $2',
        [result.eventId, citaId]
      );
    } else if (result.eventId) {
      await pool.query('UPDATE citas SET synced_at = NOW() WHERE id = $1', [citaId]);
    }
  } catch (err) {
    console.error('[Google Calendar] Error al sincronizar cita', citaId, err.message);
  }
}

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
    // Push a Google Calendar en background (no bloquea la respuesta al cliente)
    syncToGoogle(cita.id);
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
    // Sync en background
    syncToGoogle(cita.id);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await Cita.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cita no encontrada' });

    if (existing.estatus === 'realizada' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admin puede eliminar citas realizadas' });
    }

    // Eliminar de Google Calendar primero
    if (existing.google_event_id) {
      gc.deleteCitaEvent(existing.google_event_id).catch(err =>
        console.error('[Google Calendar] Error al eliminar evento', err.message)
      );
    }

    await Cita.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
