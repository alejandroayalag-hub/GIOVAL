const pool = require('../db/pool');
const gc   = require('../services/googleCalendar');

// GET /api/sync/status — indica si Google Calendar está configurado
exports.status = (req, res) => {
  res.json({ configured: gc.isConfigured() });
};

// POST /api/sync/pull — trae eventos de Google Calendar → crea/actualiza citas en DB
exports.pull = async (req, res, next) => {
  try {
    if (!gc.isConfigured()) {
      return res.status(503).json({ error: 'Google Calendar no configurado. Agrega credenciales al .env' });
    }

    // Rango: por defecto hoy + 30 días. Se puede pasar desde/hasta
    const desde = req.body.desde
      ? new Date(req.body.desde)
      : (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
    const hasta = req.body.hasta
      ? new Date(req.body.hasta)
      : (() => { const d = new Date(desde); d.setDate(d.getDate() + 30); return d; })();

    const { events } = await gc.pullEvents({ desde, hasta });

    let created = 0, updated = 0, skipped = 0;

    for (const event of events) {
      if (!event.start?.dateTime && !event.start?.date) { skipped++; continue; }

      const citaData = gc.eventToCita(event);
      const { google_event_id } = citaData;

      // Buscar si ya existe por google_event_id
      const { rows: existing } = await pool.query(
        'SELECT id FROM citas WHERE google_event_id = $1', [google_event_id]
      );

      if (existing[0]) {
        // Actualizar campos básicos (no sobreescribir tratamiento/empleada si ya están)
        await pool.query(
          `UPDATE citas SET
             nombre_paciente = $1,
             telefono        = COALESCE($2, telefono),
             fecha_hora      = $3,
             notas           = COALESCE($4, notas),
             synced_at       = NOW(),
             updated_at      = NOW()
           WHERE google_event_id = $5`,
          [citaData.nombre_paciente, citaData.telefono, citaData.fecha_hora,
           citaData.notas, google_event_id]
        );
        updated++;
      } else {
        // Insertar nueva cita
        await pool.query(
          `INSERT INTO citas (nombre_paciente, telefono, fecha_hora, notas, google_event_id, synced_at, created_by)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)
           ON CONFLICT (google_event_id) DO NOTHING`,
          [citaData.nombre_paciente, citaData.telefono, citaData.fecha_hora,
           citaData.notas, google_event_id, req.user.id]
        );
        created++;
      }
    }

    res.json({
      ok: true,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      total: events.length,
      created,
      updated,
      skipped,
    });
  } catch (err) { next(err); }
};

// POST /api/sync/push-all — empuja todas las citas sin google_event_id al calendario
exports.pushAll = async (req, res, next) => {
  try {
    if (!gc.isConfigured()) {
      return res.status(503).json({ error: 'Google Calendar no configurado' });
    }

    const { rows: citas } = await pool.query(
      `SELECT c.*, t.nombre AS tratamiento_nombre, t.duracion_min AS trat_duracion,
              e.nombre AS empleada_nombre
       FROM citas c
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN empleados e ON e.id = c.empleada_id
       WHERE c.google_event_id IS NULL
         AND c.estatus != 'cancelada'
         AND c.fecha_hora >= NOW() - INTERVAL '7 days'
       ORDER BY c.fecha_hora`
    );

    let pushed = 0, errors = 0;
    for (const cita of citas) {
      try {
        const result = await gc.pushCita(cita);
        if (result.eventId) {
          await pool.query(
            'UPDATE citas SET google_event_id = $1, synced_at = NOW() WHERE id = $2',
            [result.eventId, cita.id]
          );
          pushed++;
        }
      } catch {
        errors++;
      }
    }

    res.json({ ok: true, total: citas.length, pushed, errors });
  } catch (err) { next(err); }
};
