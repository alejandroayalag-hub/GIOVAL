const pool = require('../db/pool');
const { empresaEscritura } = require('../utils/empresa');
const { CorteCaja } = require('../models/finanzas');

const err = (status, msg) => Object.assign(new Error(msg), { status });
const round2 = n => Math.round(n * 100) / 100;
const hoyMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const FORMAS = ['efectivo', 'tarjeta', 'transferencia'];

const ABONADO = id => `(SELECT COALESCE(SUM(m.monto), 0) FROM movimientos m WHERE m.presupuesto_item_id = ${id} AND m.tipo = 'ingreso')`;

// Para cualquier consulta sobre citas `c`: ligar su paquete (tratamiento completo) si lo tiene.
// sesion_n = sesiones realizadas antes de esta cita + 1.
const PAQUETE_JOIN = `
  LEFT JOIN plan_tratamientos pq_pt ON pq_pt.id = c.plan_tratamiento_id
  LEFT JOIN presupuesto_items pq ON pq.id = pq_pt.presupuesto_item_id AND pq.modalidad = 'completo'`;
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
  if (!pq_id) return { ...resto, paquete: null };
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
    'UPDATE citas SET cobrado = true, precio_cobrado = $2 WHERE id = $1 AND NOT cobrado', [citaId, paquete.precio_sesion]);
  if (!rowCount) throw err(409, 'La cita ya estaba cobrada');
  await pool.query(
    `UPDATE flujo_paciente SET estatus = 'completado', hora_completado = NOW(), updated_at = NOW()
     WHERE cita_id = $1 AND estatus = 'en_caja'`, [citaId]);
  return paquete;
}

module.exports = { ABONADO, PAQUETE_JOIN, PAQUETE_COLS, aviso50, conPaquete, paqueteDeCita, registrarAbono, cubrirConPaquete };
