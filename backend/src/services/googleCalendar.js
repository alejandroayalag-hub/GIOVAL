const { google } = require('googleapis');

// Credenciales pendientes — agregar al .env cuando las tengas:
// GOOGLE_CLIENT_ID=...
// GOOGLE_CLIENT_SECRET=...
// GOOGLE_REFRESH_TOKEN=...   (obtener con el flujo OAuth2 una sola vez)
// GOOGLE_CALENDAR_ID=primary  (o el ID del calendario específico)

function isConfigured() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN);
}

function getClient() {
  if (!isConfigured()) return null;
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

// Convierte una cita de DB a evento de Google Calendar
function citaToEvent(cita) {
  const start = new Date(cita.fecha_hora);
  const end = new Date(start.getTime() + (cita.duracion_min || 60) * 60000);

  const lines = [`Paciente: ${cita.nombre_paciente}`];
  if (cita.telefono) lines.push(`Tel: ${cita.telefono}`);
  if (cita.tratamiento_nombre) lines.push(`Tratamiento: ${cita.tratamiento_nombre}`);
  if (cita.empleada_nombre) lines.push(`Atiende: ${cita.empleada_nombre}`);
  if (cita.notas) lines.push(`\n${cita.notas}`);

  // Color según estatus
  const colorId = cita.estatus === 'cancelada' ? '8'   // graphite
    : cita.estatus === 'realizada'              ? '2'   // sage
    : '3';                                              // grape (pendiente)

  return {
    summary: `${cita.nombre_paciente}${cita.tratamiento_nombre ? ` · ${cita.tratamiento_nombre}` : ''}`,
    description: lines.join('\n'),
    start: { dateTime: start.toISOString(), timeZone: 'America/Mexico_City' },
    end:   { dateTime: end.toISOString(),   timeZone: 'America/Mexico_City' },
    colorId,
    extendedProperties: {
      private: { elys_cita_id: String(cita.id) },
    },
  };
}

// Convierte un evento de Google Calendar a datos de cita
function eventToCita(event) {
  const fechaHora = event.start?.dateTime || event.start?.date;
  const endTime   = event.end?.dateTime   || event.end?.date;
  let duracion_min = 60;
  if (fechaHora && endTime) {
    duracion_min = Math.round((new Date(endTime) - new Date(fechaHora)) / 60000);
  }

  // Extraer nombre_paciente del summary (primer segmento antes de ·)
  const summary = event.summary || 'Sin nombre';
  const nombre_paciente = summary.split('·')[0].trim();

  // Extraer teléfono de description si existe
  const desc = event.description || '';
  const telMatch = desc.match(/Tel:\s*([^\n]+)/);

  return {
    nombre_paciente,
    telefono: telMatch ? telMatch[1].trim() : null,
    fecha_hora: fechaHora,
    duracion_min,
    notas: desc || null,
    google_event_id: event.id,
  };
}

// Crear o actualizar evento en Google Calendar
async function pushCita(cita) {
  const cal = getClient();
  if (!cal) return { skipped: true, reason: 'no_config' };

  const event = citaToEvent(cita);
  try {
    if (cita.google_event_id) {
      const res = await cal.events.update({
        calendarId: CALENDAR_ID(),
        eventId: cita.google_event_id,
        requestBody: event,
      });
      return { action: 'updated', eventId: res.data.id };
    } else {
      const res = await cal.events.insert({
        calendarId: CALENDAR_ID(),
        requestBody: event,
      });
      return { action: 'created', eventId: res.data.id };
    }
  } catch (err) {
    // Evento no existe en Google (borrado manualmente) → crear nuevo
    if (err.code === 404 || err.code === 410) {
      const res = await cal.events.insert({
        calendarId: CALENDAR_ID(),
        requestBody: event,
      });
      return { action: 'recreated', eventId: res.data.id };
    }
    throw err;
  }
}

// Eliminar evento de Google Calendar
async function deleteCitaEvent(googleEventId) {
  const cal = getClient();
  if (!cal || !googleEventId) return;
  try {
    await cal.events.delete({ calendarId: CALENDAR_ID(), eventId: googleEventId });
  } catch (err) {
    if (err.code !== 404 && err.code !== 410) throw err;
  }
}

// Pull: traer eventos de Google Calendar en un rango y devolver lista
async function pullEvents({ desde, hasta }) {
  const cal = getClient();
  if (!cal) return { skipped: true, reason: 'no_config', events: [] };

  const res = await cal.events.list({
    calendarId: CALENDAR_ID(),
    timeMin: new Date(desde).toISOString(),
    timeMax: new Date(hasta).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 500,
  });

  return { events: res.data.items || [] };
}

module.exports = { isConfigured, pushCita, deleteCitaEvent, pullEvents, eventToCita, citaToEvent };
