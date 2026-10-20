// Cálculo de horarios disponibles para la agenda en línea.
const pool = require('../db/pool');

// ponytail: horario fijo en código (L–V 8–17, Sáb 9–14); pasar a tabla si Gio quiere editarlo desde Elys
const HORARIO = { 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [9, 14] };
const PASO_MIN = 30;
const ANTICIPACION_MIN = 120; // no se puede reservar con menos de 2 h
// ponytail: Michoacán sin horario de verano desde 2022 → offset fijo
const TZ = '-06:00';

// Estatus que ocupan horario (apartada solo mientras no expire)
const OCUPA = `(c.estatus IN ('pendiente', 'por_confirmar', 'realizada')
                OR (c.estatus = 'apartada' AND c.apartada_hasta > NOW()))`;

const hhmm = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function esValoracion(t) {
  return /^valoraci/i.test(t.nombre);
}

// Especialistas activas que realizan el tratamiento
async function especialistas(tratamientoId) {
  const { rows } = await pool.query(
    `SELECT e.id, e.nombre, e.apellido_paterno
     FROM empleado_tratamiento et
     JOIN empleados e ON e.id = et.empleado_id
     WHERE et.tratamiento_id = $1 AND e.estatus = 'activo'
     ORDER BY e.nombre`,
    [tratamientoId]
  );
  return rows;
}

// Horarios libres de un día: [{ hora: '08:00', empleadas: [ids libres] }]
// empleadaId null = cualquiera que realice el tratamiento. excluirCitaId para reagendar.
async function slotsDelDia({ fecha, tratamientoId, empleadaId = null, excluirCitaId = null, db = pool }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [];
  const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const horario = HORARIO[dow];
  if (!horario) return [];

  const { rows: [trat] } = await db.query('SELECT duracion_min FROM tratamientos WHERE id = $1 AND activo', [tratamientoId]);
  if (!trat) return [];
  const dur = trat.duracion_min || 60;

  let candidatas = (await especialistas(tratamientoId)).map(e => e.id);
  if (empleadaId) candidatas = candidatas.filter(id => id === Number(empleadaId));
  if (!candidatas.length) return [];

  // Ocupación del día por empleada, en minutos desde medianoche local
  const { rows: ocupadas } = await db.query(
    `SELECT c.empleada_id,
            EXTRACT(EPOCH FROM (c.fecha_hora - $2::timestamptz)) / 60 AS ini,
            COALESCE(t.duracion_min, 60) AS dur
     FROM citas c
     LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
     WHERE c.empleada_id = ANY($1)
       AND c.fecha_hora >= $2::timestamptz AND c.fecha_hora < $2::timestamptz + INTERVAL '1 day'
       AND c.id IS DISTINCT FROM $3
       AND ${OCUPA}`,
    [candidatas, `${fecha}T00:00:00${TZ}`, excluirCitaId]
  );

  const minimo = Date.now() + ANTICIPACION_MIN * 60000;
  const slots = [];
  for (let s = horario[0] * 60; s + dur <= horario[1] * 60; s += PASO_MIN) {
    if (new Date(`${fecha}T${hhmm(s)}:00${TZ}`).getTime() < minimo) continue;
    const libres = candidatas.filter(id => !ocupadas.some(o =>
      o.empleada_id === id && s < Number(o.ini) + o.dur && Number(o.ini) < s + dur));
    if (libres.length) slots.push({ hora: hhmm(s), empleadas: libres });
  }
  return slots;
}

// Últimos 10 dígitos del teléfono (quita +52, espacios, guiones)
const normalizaTel = tel => String(tel || '').replace(/\D/g, '').slice(-10);

// Paciente de continuación = ya tiene al menos una cita realizada con ese teléfono
async function esContinuacion(telefono) {
  const tel = normalizaTel(telefono);
  if (tel.length !== 10) return false;
  const { rows } = await pool.query(
    `SELECT 1 FROM citas c
     LEFT JOIN pacientes p ON p.id = c.paciente_id
     WHERE c.estatus = 'realizada'
       AND (RIGHT(regexp_replace(COALESCE(c.telefono, ''), '\\D', '', 'g'), 10) = $1
         OR RIGHT(regexp_replace(COALESCE(p.telefono, ''), '\\D', '', 'g'), 10) = $1)
     LIMIT 1`,
    [tel]
  );
  return rows.length > 0;
}

module.exports = { HORARIO, TZ, slotsDelDia, especialistas, esValoracion, esContinuacion, normalizaTel };
