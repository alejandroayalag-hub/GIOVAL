const pool = require('../db/pool');
const { empresaEscritura } = require('../utils/empresa');
const { CorteCaja } = require('../models/finanzas');
const { hoyMx, diaMx } = require('../utils/fecha');

const err = (status, msg) => Object.assign(new Error(msg), { status });
const round2 = n => Math.round(n * 100) / 100;
const FORMAS = ['efectivo', 'tarjeta', 'transferencia'];

// Abonado = abonos del item + lo pagado en citas del paquete (p. ej. anticipo en línea)
const ABONADO = id => `(SELECT COALESCE(SUM(m.monto), 0) FROM movimientos m WHERE m.tipo = 'ingreso' AND (m.presupuesto_item_id = ${id}
  OR m.cita_id IN (SELECT cx.id FROM citas cx JOIN plan_tratamientos px ON px.id = cx.plan_tratamiento_id WHERE px.presupuesto_item_id = ${id})))`;

// Para cualquier consulta sobre citas `c`: ligar su paquete (tratamiento completo) si lo tiene.
// sesion_n = sesiones realizadas antes de esta cita + 1.
const PAQUETE_JOIN = `
  LEFT JOIN plan_tratamientos pq_pt ON pq_pt.id = c.plan_tratamiento_id
  LEFT JOIN presupuesto_items pq ON pq.id = pq_pt.presupuesto_item_id AND pq.modalidad = 'completo'
    AND pq_pt.estatus IN ('aceptado', 'completado')`;
const PAQUETE_COLS = `
  pq.id AS pq_id, pq.subtotal::float AS pq_subtotal, pq.sesiones AS pq_sesiones,
  CASE WHEN pq.id IS NOT NULL THEN ${ABONADO('pq.id')}::float END AS pq_abonado,
  CASE WHEN pq.id IS NOT NULL THEN 1 + (SELECT count(*)::int FROM citas c2 WHERE c2.plan_tratamiento_id = c.plan_tratamiento_id
    AND c2.estatus = 'realizada' AND (c2.fecha_hora, c2.id) < (c.fecha_hora, c.id)) END AS pq_sesion_n`;

function aviso50({ sesion_n, sesiones, subtotal, abonado }) {
  return sesion_n >= Math.ceil(sesiones / 2) && abonado < subtotal / 2;
}

// Saca las columnas pq_* de la fila y las deja como `paquete` (o null)
function conPaquete(row) {
  const { pq_id, pq_subtotal, pq_sesiones, pq_abonado, pq_sesion_n, ...resto } = row;
  // sesiones de más (más allá de las pactadas) ya no son del paquete: nuevo presupuesto
  if (!pq_id || pq_sesion_n > pq_sesiones) return { ...resto, paquete: null };
  const paquete = {
    presupuesto_item_id: pq_id, subtotal: pq_subtotal, sesiones: pq_sesiones, abonado: pq_abonado,
    saldo: round2(pq_subtotal - pq_abonado), sesion_n: pq_sesion_n, precio_sesion: round2(pq_subtotal / pq_sesiones),
  };
  paquete.aviso_50 = aviso50(paquete);
  return { ...resto, paquete };
}

async function paqueteDeCita(citaId) {
  const { rows: [r] } = await pool.query(`SELECT ${PAQUETE_COLS} FROM citas c ${PAQUETE_JOIN} WHERE c.id = $1`, [citaId]);
  return r ? conPaquete(r).paquete : null;
}

async function registrarAbono({ presupuesto_item_id, monto, forma_pago, empresa }, userId) {
  const importe = round2(Number(monto));
  if (!(importe > 0)) throw err(400, 'El abono debe ser mayor a 0');
  if (forma_pago && !FORMAS.includes(forma_pago)) throw err(400, 'Forma de pago inválida');
  const emp = empresaEscritura(empresa);
  const fecha = hoyMx();
  if (await CorteCaja.estaCerrado(fecha, emp)) throw err(409, 'El corte de hoy ya está cerrado');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE: dos abonos simultáneos no pueden rebasar el saldo
    const { rows: [it] } = await client.query(
      `SELECT pi.id, pi.modalidad, pt.estatus, pi.subtotal::float AS subtotal, t.nombre AS tratamiento_nombre
       FROM presupuesto_items pi
       JOIN plan_tratamientos pt ON pt.id = pi.plan_tratamiento_id
       JOIN tratamientos t ON t.id = pt.tratamiento_id
       WHERE pi.id = $1 FOR UPDATE OF pi`, [presupuesto_item_id]);
    if (!it) throw err(404, 'Tratamiento no encontrado');
    if (it.estatus === 'cancelado') throw err(400, 'El tratamiento está cancelado');
    if (it.modalidad !== 'completo') throw err(400, 'Los abonos son solo para tratamiento completo; el pago por sesión se cobra en cada cita');
    const { rows: [{ abonado }] } = await client.query(`SELECT ${ABONADO('$1')}::float AS abonado`, [it.id]);
    const saldo = round2(it.subtotal - abonado);
    if (importe > saldo) throw err(400, `El abono excede el saldo ($${saldo})`);
    const { rows: [movimiento] } = await client.query(
      `INSERT INTO movimientos (tipo, concepto, monto, forma_pago, fecha, created_by, empresa, presupuesto_item_id)
       VALUES ('ingreso', $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [`Abono · ${it.tratamiento_nombre}`, importe, forma_pago || 'efectivo', fecha, userId, emp, it.id]);
    await client.query('COMMIT');
    return { movimiento, estado: { subtotal: it.subtotal, abonado: round2(abonado + importe), saldo: round2(saldo - importe) } };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// La sesión de un tratamiento completo se marca cobrada sin cobro nuevo; su ingreso
// para "ganancia por tratamiento" es subtotal ÷ sesiones.
async function cubrirConPaquete(citaId) {
  const paquete = await paqueteDeCita(citaId);
  if (!paquete) throw err(400, 'La cita no es de un tratamiento completo');
  const { rowCount } = await pool.query(
    `UPDATE citas SET cobrado = true, precio_cobrado = $2 WHERE id = $1 AND NOT cobrado AND estatus = 'realizada'`, [citaId, paquete.precio_sesion]);
  if (!rowCount && (await pool.query('SELECT estatus FROM citas WHERE id = $1', [citaId])).rows[0]?.estatus !== 'realizada')
    throw err(400, 'La cita aún no está realizada');
  if (!rowCount) throw err(409, 'La cita ya estaba cobrada');
  await pool.query(
    `UPDATE flujo_paciente SET estatus = 'completado', hora_completado = NOW(), updated_at = NOW()
     WHERE cita_id = $1 AND estatus = 'en_caja'`, [citaId]);
  return paquete;
}

// Citas realizadas sin cobrar que nunca se ligaron a su plan (marcadas realizadas desde la agenda):
// si la paciente tiene exactamente un plan aceptado de ese tratamiento, se ligan para cobrarlas bien.
async function ligarCitasSinPlan(fecha) {
  const { rows } = await pool.query(
    `UPDATE citas c SET plan_tratamiento_id = u.plan_id
     FROM (SELECT c.id, min(pt.id) AS plan_id
           FROM citas c JOIN plan_tratamientos pt ON pt.paciente_id = c.paciente_id
             AND pt.tratamiento_id = c.tratamiento_id AND pt.estatus = 'aceptado'
           WHERE c.plan_tratamiento_id IS NULL AND c.estatus = 'realizada' AND NOT c.cobrado AND ${diaMx('c.fecha_hora')} = $1
           GROUP BY c.id HAVING count(*) = 1) u
     WHERE c.id = u.id RETURNING c.plan_tratamiento_id`, [fecha]);
  const { actualizarAvance } = require('./planTratamiento'); // aquí para evitar require circular
  for (const r of rows) await actualizarAvance(r.plan_tratamiento_id);
}

const ROLES_COBRO = ['admin', 'asistente_general', 'asistente_medico'];

// Editar/borrar un abono desde Finanzas: mismos roles que Caja y sin rebasar el saldo
async function validarEdicionAbono(mov, nuevoMonto, rol) {
  if (!ROLES_COBRO.includes(rol)) throw err(403, 'Solo recepción o admin pueden modificar abonos');
  if (nuevoMonto === undefined) return;
  const { rows: [r] } = await pool.query(
    `SELECT pi.subtotal::float AS subtotal, ${ABONADO('pi.id')}::float AS abonado FROM presupuesto_items pi WHERE pi.id = $1`,
    [mov.presupuesto_item_id]);
  const saldo = round2(r.subtotal - r.abonado + Number(mov.monto));
  if (round2(Number(nuevoMonto)) > saldo) throw err(400, `El abono excede el saldo ($${saldo})`);
}

module.exports = { ROLES_COBRO, ligarCitasSinPlan, validarEdicionAbono, ABONADO, PAQUETE_JOIN, PAQUETE_COLS, aviso50, conPaquete, paqueteDeCita, registrarAbono, cubrirConPaquete };
