// Agenda en línea: reservas desde gioval.mx/agendar + bandeja de recepción
const crypto = require('crypto');
const pool = require('../db/pool');
const gc = require('../services/googleCalendar');
const mp = require('../services/mercadoPago');
const { TZ, slotsDelDia, especialistas, esValoracion, esContinuacion, normalizaTel } = require('../services/agenda');
const { syncToGoogle } = require('./citasController');
const { hoyMx } = require('../utils/fecha');

const ANTICIPO = 300;
const MINUTOS_APARTADO = 30;
const HORAS_CANCELACION = 24;

const err = (status, message) => Object.assign(new Error(message), { status });

async function tratamiento(id) {
  const { rows: [t] } = await pool.query(
    'SELECT id, nombre, categoria, duracion_min, precio FROM tratamientos WHERE id = $1 AND activo', [id]);
  return t;
}

async function registrarMovimiento({ tipo, concepto, monto, forma_pago, cita_id, created_by = null }) {
  await pool.query(
    `INSERT INTO movimientos (tipo, categoria_id, concepto, monto, forma_pago, cita_id, created_by, fecha)
     VALUES ($1, (SELECT id FROM categorias_movimiento WHERE nombre = 'Anticipo cita'), $2, $3, $4, $5, $6, $7)`,
    [tipo, concepto, monto, forma_pago, cita_id, created_by, hoyMx()]
  );
}

// Al cancelar: devuelve el anticipo (si aplica) o lo retiene
async function resolverAnticipo(cita, conDevolucion, userId = null) {
  if (cita.anticipo_estado !== 'pagado') return null;
  if (!conDevolucion) return 'retenido';
  if (cita.mp_payment_id && mp.isConfigured()) {
    await mp.devolver(cita.mp_payment_id);
    await registrarMovimiento({ tipo: 'egreso', concepto: `Devolución anticipo cita #${cita.id}`,
      monto: cita.anticipo, forma_pago: 'tarjeta', cita_id: cita.id, created_by: userId });
    return 'devuelto';
  }
  return 'por_devolver'; // pagado en efectivo/transferencia: recepción lo devuelve a mano
}

async function quitarDeGoogle(cita) {
  if (!cita.google_event_id) return;
  gc.deleteCitaEvent(cita.google_event_id).catch(e => console.error('[Google Calendar]', e.message));
  await pool.query('UPDATE citas SET google_event_id = NULL WHERE id = $1', [cita.id]);
}

const horasFaltantes = cita => (new Date(cita.fecha_hora).getTime() - Date.now()) / 3600000;

// ─── Público ────────────────────────────────────────────────────────────────

// GET /api/public/agenda/servicios?telefono=
// Pacientes nuevos solo ven valoraciones; de continuación ven todo lo agendable.
exports.servicios = async (req, res, next) => {
  try {
    if (normalizaTel(req.query.telefono).length !== 10)
      return res.status(400).json({ error: 'Escribe tu WhatsApp a 10 dígitos' });
    const continuacion = await esContinuacion(req.query.telefono);
    const { rows } = await pool.query(
      `SELECT t.id, t.nombre, t.categoria, t.duracion_min, t.precio
       FROM tratamientos t
       WHERE t.activo AND EXISTS (
         SELECT 1 FROM empleado_tratamiento et JOIN empleados e ON e.id = et.empleado_id
         WHERE et.tratamiento_id = t.id AND e.estatus = 'activo')
       ORDER BY t.categoria, t.orden, t.nombre`
    );
    res.json({ continuacion, anticipo: ANTICIPO, servicios: continuacion ? rows : rows.filter(esValoracion) });
  } catch (e) { next(e); }
};

// GET /api/public/agenda/especialistas?tratamiento_id=
exports.especialistas = async (req, res, next) => {
  try {
    const rows = await especialistas(req.query.tratamiento_id);
    res.json(rows.map(e => ({ id: e.id, nombre: `${e.nombre} ${e.apellido_paterno || ''}`.trim() })));
  } catch (e) { next(e); }
};

// GET /api/public/agenda/dias?tratamiento_id=&empleada_id=&mes=YYYY-MM → fechas con lugar
exports.dias = async (req, res, next) => {
  try {
    const { tratamiento_id, empleada_id, mes } = req.query;
    if (!/^\d{4}-\d{2}$/.test(mes || '')) return res.status(400).json({ error: 'mes inválido' });
    const [y, m] = mes.split('-').map(Number);
    const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const dias = [];
    // ponytail: una consulta por día (≤31), suficiente para una clínica
    for (let d = 1; d <= total; d++) {
      const fecha = `${mes}-${String(d).padStart(2, '0')}`;
      const slots = await slotsDelDia({ fecha, tratamientoId: tratamiento_id, empleadaId: empleada_id || null });
      if (slots.length) dias.push(fecha);
    }
    res.json(dias);
  } catch (e) { next(e); }
};

// GET /api/public/agenda/horarios?tratamiento_id=&empleada_id=&fecha=
exports.horarios = async (req, res, next) => {
  try {
    const { tratamiento_id, empleada_id, fecha } = req.query;
    const slots = await slotsDelDia({ fecha, tratamientoId: tratamiento_id, empleadaId: empleada_id || null });
    res.json(slots.map(s => s.hora));
  } catch (e) { next(e); }
};

// Toma el horario dentro de una transacción con candado (evita doble reserva)
async function apartarHorario(client, { fecha, hora, tratamientoId, empleadaId, excluirCitaId = null }) {
  await client.query('SELECT pg_advisory_xact_lock(4207)'); // ponytail: candado global, basta para una clínica
  const slots = await slotsDelDia({ fecha, tratamientoId, empleadaId, excluirCitaId, db: client });
  const slot = slots.find(s => s.hora === hora);
  if (!slot) throw err(409, 'Ese horario acaba de ocuparse, elige otro');
  return slot.empleadas[0];
}

// POST /api/public/agenda/reservar
exports.reservar = async (req, res, next) => {
  const { telefono, nombre, apellido, email, tratamiento_id, empleada_id, fecha, hora, acepta_aviso } = req.body;
  const tel = normalizaTel(telefono);
  if (tel.length !== 10) return res.status(400).json({ error: 'Escribe tu WhatsApp a 10 dígitos' });
  if (!nombre?.trim() || !apellido?.trim()) return res.status(400).json({ error: 'Nombre y apellido son requeridos' });
  if (nombre.length > 100 || apellido.length > 100) return res.status(400).json({ error: 'Nombre demasiado largo' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Correo inválido' });
  if (!acepta_aviso) return res.status(400).json({ error: 'Debes aceptar el aviso de privacidad' });
  if (!/^\d{2}:\d{2}$/.test(hora || '')) return res.status(400).json({ error: 'Horario inválido' });

  const client = await pool.connect();
  try {
    const t = await tratamiento(tratamiento_id);
    if (!t) return res.status(400).json({ error: 'Tratamiento no disponible' });
    if (!esValoracion(t) && !(await esContinuacion(tel)))
      return res.status(403).json({ error: 'Tu primera cita debe ser una valoración con la Dra. Giovanna' });

    const { rows: [{ activas }] } = await pool.query(
      `SELECT COUNT(*)::int AS activas FROM citas
       WHERE origen = 'online' AND telefono = $1 AND fecha_hora > NOW()
         AND (estatus IN ('por_confirmar', 'pendiente') OR (estatus = 'apartada' AND apartada_hasta > NOW()))`, [tel]);
    if (activas >= 3) return res.status(429).json({ error: 'Ya tienes varias citas en proceso; escríbenos por WhatsApp' });

    await client.query('BEGIN');
    const empleada = await apartarHorario(client, { fecha, hora, tratamientoId: t.id, empleadaId: empleada_id || null });
    const conPago = mp.isConfigured();
    const token = crypto.randomUUID();
    const { rows: [cita] } = await client.query(
      `INSERT INTO citas (nombre_paciente, telefono, email, tratamiento_id, empleada_id, fecha_hora, notas,
                          estatus, origen, token, apartada_hasta, anticipo, anticipo_estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'Reservada en línea', $7::text, 'online', $8,
               CASE WHEN $7::text = 'apartada' THEN NOW() + make_interval(mins => $9) END, $10, 'pendiente')
       RETURNING *`,
      [`${nombre.trim()} ${apellido.trim()}`, tel, email?.trim() || null, t.id, empleada,
       `${fecha}T${hora}:00${TZ}`, conPago ? 'apartada' : 'por_confirmar', token, MINUTOS_APARTADO, ANTICIPO]
    );
    await client.query('COMMIT');

    if (!conPago) return res.status(201).json({ token, pago_url: null });
    try {
      const pago_url = await mp.crearPreferencia({
        token, titulo: `Anticipo · ${t.nombre}`, monto: ANTICIPO, email: cita.email, minutos: MINUTOS_APARTADO });
      res.status(201).json({ token, pago_url });
    } catch (e) {
      await pool.query(`UPDATE citas SET estatus = 'cancelada' WHERE id = $1`, [cita.id]);
      console.error('[MercadoPago] preferencia', e.message);
      res.status(502).json({ error: 'No pudimos iniciar el pago. Intenta de nuevo o escríbenos por WhatsApp' });
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  } finally { client.release(); }
};

// POST /api/public/agenda/mp/webhook — se re-consulta el pago en MP, el body no se confía
exports.webhookMP = async (req, res) => {
  try {
    const id = req.body?.data?.id || req.query['data.id'] || req.query.id;
    const tipo = req.body?.type || req.query.type || req.query.topic;
    if (tipo === 'payment' && id && mp.isConfigured()) {
      const pago = await mp.obtenerPago(id);
      if (pago.status === 'approved' && pago.external_reference) {
        const { rows: [cita] } = await pool.query(
          `UPDATE citas SET anticipo_estado = 'pagado', mp_payment_id = $2, apartada_hasta = NULL,
                  estatus = CASE WHEN estatus = 'apartada' THEN 'por_confirmar' ELSE estatus END,
                  updated_at = NOW()
           WHERE token = $1 AND anticipo_estado = 'pendiente' RETURNING *`,
          [pago.external_reference, String(id)]
        );
        if (cita) {
          const forma = /card/.test(pago.payment_type_id || '') ? 'tarjeta' : 'otro';
          await registrarMovimiento({ tipo: 'ingreso', concepto: `Anticipo en línea cita #${cita.id} — ${cita.nombre_paciente}`,
            monto: cita.anticipo, forma_pago: forma, cita_id: cita.id });
        }
      }
    }
  } catch (e) { console.error('[MercadoPago] webhook', e.message); }
  res.sendStatus(200);
};

async function citaPorToken(token) {
  if (!/^[0-9a-f-]{36}$/i.test(token || '')) return null;
  const { rows: [c] } = await pool.query(
    `SELECT c.*, t.nombre AS tratamiento_nombre, e.nombre AS empleada_nombre
     FROM citas c
     LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
     LEFT JOIN empleados e ON e.id = c.empleada_id
     WHERE c.token = $1`, [token]);
  return c;
}

// GET /api/public/agenda/cita/:token
exports.verCita = async (req, res, next) => {
  try {
    const c = await citaPorToken(req.params.token);
    if (!c) return res.status(404).json({ error: 'Cita no encontrada' });
    const expirada = c.estatus === 'apartada' && new Date(c.apartada_hasta) < new Date();
    const activa = ['por_confirmar', 'pendiente'].includes(c.estatus) && horasFaltantes(c) > 0;
    res.json({
      estatus: expirada ? 'expirada' : c.estatus,
      fecha_hora: c.fecha_hora,
      tratamiento_id: c.tratamiento_id,
      tratamiento: c.tratamiento_nombre,
      especialista: c.empleada_nombre,
      nombre: c.nombre_paciente,
      anticipo: c.anticipo,
      anticipo_estado: c.anticipo_estado,
      puede_reagendar: activa && horasFaltantes(c) >= HORAS_CANCELACION,
      puede_cancelar: activa || (c.estatus === 'apartada' && !expirada),
      cancelacion_con_devolucion: horasFaltantes(c) >= HORAS_CANCELACION,
    });
  } catch (e) { next(e); }
};

// POST /api/public/agenda/cita/:token/reagendar { fecha, hora }
exports.reagendar = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const c = await citaPorToken(req.params.token);
    if (!c || !['por_confirmar', 'pendiente'].includes(c.estatus))
      return res.status(404).json({ error: 'Cita no encontrada o no se puede reagendar' });
    if (horasFaltantes(c) < HORAS_CANCELACION)
      return res.status(409).json({ error: `Solo se puede reagendar hasta ${HORAS_CANCELACION} h antes; escríbenos por WhatsApp` });
    const { fecha, hora } = req.body;
    if (!/^\d{2}:\d{2}$/.test(hora || '')) return res.status(400).json({ error: 'Horario inválido' });

    await client.query('BEGIN');
    // Prefiere a la misma especialista; si no está libre, cualquiera que haga el tratamiento
    let empleada;
    try {
      empleada = await apartarHorario(client, { fecha, hora, tratamientoId: c.tratamiento_id, empleadaId: c.empleada_id, excluirCitaId: c.id });
    } catch {
      empleada = await apartarHorario(client, { fecha, hora, tratamientoId: c.tratamiento_id, empleadaId: null, excluirCitaId: c.id });
    }
    await client.query(
      `UPDATE citas SET fecha_hora = $1, empleada_id = $2, estatus = 'por_confirmar', updated_at = NOW() WHERE id = $3`,
      [`${fecha}T${hora}:00${TZ}`, empleada, c.id]);
    await client.query('COMMIT');
    await quitarDeGoogle(c); // se vuelve a subir cuando recepción confirme
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  } finally { client.release(); }
};

// POST /api/public/agenda/cita/:token/cancelar
exports.cancelar = async (req, res, next) => {
  try {
    const c = await citaPorToken(req.params.token);
    if (!c || !['apartada', 'por_confirmar', 'pendiente'].includes(c.estatus) || horasFaltantes(c) <= 0)
      return res.status(404).json({ error: 'Cita no encontrada o ya no se puede cancelar' });
    const anticipo = await resolverAnticipo(c, horasFaltantes(c) >= HORAS_CANCELACION);
    await pool.query(
      `UPDATE citas SET estatus = 'cancelada', anticipo_estado = COALESCE($2, anticipo_estado), updated_at = NOW() WHERE id = $1`,
      [c.id, anticipo]);
    await quitarDeGoogle(c);
    res.json({ ok: true, anticipo_estado: anticipo });
  } catch (e) { next(e); }
};

// ─── Recepción (auth) ───────────────────────────────────────────────────────

// GET /api/agenda-online → reservas por confirmar, anticipos pendientes y devoluciones por hacer
exports.bandeja = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.nombre_paciente, c.telefono, c.email, c.fecha_hora, c.estatus, c.token,
              c.anticipo, c.anticipo_estado, c.paciente_id, c.created_at,
              t.nombre AS tratamiento_nombre, t.precio, e.nombre AS empleada_nombre
       FROM citas c
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN empleados e ON e.id = c.empleada_id
       WHERE c.origen = 'online' AND (
             c.estatus = 'por_confirmar'
          OR c.anticipo_estado = 'por_devolver'
          OR (c.estatus = 'pendiente' AND c.anticipo_estado = 'pendiente' AND c.fecha_hora > NOW()))
       ORDER BY c.fecha_hora`
    );
    res.json(rows);
  } catch (e) { next(e); }
};

async function citaOnline(id) {
  const { rows: [c] } = await pool.query(`SELECT * FROM citas WHERE id = $1 AND origen = 'online'`, [id]);
  if (!c) throw err(404, 'Cita no encontrada');
  return c;
}

// Liga la cita al paciente con ese teléfono, o crea un registro básico
async function asegurarPaciente(c, userId) {
  if (c.paciente_id) return c.paciente_id;
  const { rows: [p] } = await pool.query(
    `SELECT id FROM pacientes WHERE RIGHT(regexp_replace(COALESCE(telefono, ''), '\\D', '', 'g'), 10) = $1
     ORDER BY id LIMIT 1`, [normalizaTel(c.telefono)]);
  if (p) return p.id;
  const [nombre, ...resto] = c.nombre_paciente.split(' ');
  const { rows: [nuevo] } = await pool.query(
    `INSERT INTO pacientes (nombre, apellido_paterno, telefono, email, fecha_registro, created_by)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, $5) RETURNING id`,
    [nombre, resto.join(' ') || '-', c.telefono, c.email, userId]);
  return nuevo.id;
}

const responder = fn => async (req, res, next) => {
  try { res.json(await fn(req)); }
  catch (e) { if (e.status) return res.status(e.status).json({ error: e.message }); next(e); }
};

// POST /api/agenda-online/:id/confirmar
exports.confirmar = responder(async req => {
  const c = await citaOnline(req.params.id);
  if (c.estatus !== 'por_confirmar') throw err(409, 'La cita ya no está por confirmar');
  const pacienteId = await asegurarPaciente(c, req.user.id);
  await pool.query(`UPDATE citas SET estatus = 'pendiente', paciente_id = $2, updated_at = NOW() WHERE id = $1`, [c.id, pacienteId]);
  syncToGoogle(c.id);
  return { ok: true, paciente_id: pacienteId };
});

// POST /api/agenda-online/:id/rechazar
exports.rechazar = responder(async req => {
  const c = await citaOnline(req.params.id);
  if (c.estatus !== 'por_confirmar') throw err(409, 'La cita ya no está por confirmar');
  const anticipo = await resolverAnticipo(c, true, req.user.id);
  await pool.query(
    `UPDATE citas SET estatus = 'cancelada', anticipo_estado = COALESCE($2, anticipo_estado), updated_at = NOW() WHERE id = $1`,
    [c.id, anticipo]);
  await quitarDeGoogle(c);
  return { ok: true, anticipo_estado: anticipo };
});

// POST /api/agenda-online/:id/anticipo { forma_pago } — anticipo recibido por fuera de MP
exports.registrarAnticipo = responder(async req => {
  const { forma_pago } = req.body;
  if (!['efectivo', 'transferencia', 'tarjeta'].includes(forma_pago)) throw err(400, 'forma_pago inválida');
  const c = await citaOnline(req.params.id);
  if (c.anticipo_estado !== 'pendiente') throw err(409, 'El anticipo ya fue registrado');
  await pool.query(`UPDATE citas SET anticipo_estado = 'pagado', updated_at = NOW() WHERE id = $1`, [c.id]);
  await registrarMovimiento({ tipo: 'ingreso', concepto: `Anticipo cita #${c.id} — ${c.nombre_paciente}`,
    monto: c.anticipo, forma_pago, cita_id: c.id, created_by: req.user.id });
  return { ok: true };
});

// POST /api/agenda-online/:id/devuelto { forma_pago } — devolución manual hecha
exports.marcarDevuelto = responder(async req => {
  const forma_pago = req.body.forma_pago || 'transferencia';
  if (!['efectivo', 'transferencia', 'tarjeta'].includes(forma_pago)) throw err(400, 'forma_pago inválida');
  const c = await citaOnline(req.params.id);
  if (c.anticipo_estado !== 'por_devolver') throw err(409, 'No hay devolución pendiente');
  await pool.query(`UPDATE citas SET anticipo_estado = 'devuelto', updated_at = NOW() WHERE id = $1`, [c.id]);
  await registrarMovimiento({ tipo: 'egreso', concepto: `Devolución anticipo cita #${c.id} — ${c.nombre_paciente}`,
    monto: c.anticipo, forma_pago, cita_id: c.id, created_by: req.user.id });
  return { ok: true };
});

// GET /api/agenda-online/especialistas/:empleadoId → ids de tratamientos que realiza
exports.tratamientosDeEmpleada = responder(async req => {
  const { rows } = await pool.query(
    'SELECT tratamiento_id FROM empleado_tratamiento WHERE empleado_id = $1', [req.params.empleadoId]);
  return rows.map(r => r.tratamiento_id);
});

// PUT /api/agenda-online/especialistas/:empleadoId { tratamiento_ids: [] }
exports.guardarTratamientosDeEmpleada = responder(async req => {
  const ids = (req.body.tratamiento_ids || []).map(Number).filter(Number.isInteger);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM empleado_tratamiento WHERE empleado_id = $1', [req.params.empleadoId]);
    if (ids.length) await client.query(
      `INSERT INTO empleado_tratamiento (empleado_id, tratamiento_id)
       SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`, [req.params.empleadoId, ids]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return { ok: true, total: ids.length };
});
