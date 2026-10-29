const pool = require('../db/pool');

// Citas que nunca piden presupuesto ni consentimiento de tratamiento
const EXENTO_SQL = `(t.nombre ILIKE 'valoraci%' OR t.nombre IN ('Cita de seguimiento', 'Anticipo para reservar cita'))`;

// Qué le falta a una cita para "⚡ Iniciar procedimiento": ⊆ ['tratamiento','presupuesto','consentimiento'].
// Si la cita no tiene plan y el paciente tiene exactamente un plan aceptado de ese tratamiento, lo liga.
async function requisitosProcedimiento(citaId) {
  const { rows: [c] } = await pool.query(
    `SELECT c.id, c.paciente_id, c.tratamiento_id, c.plan_tratamiento_id, COALESCE(${EXENTO_SQL}, false) AS exento
     FROM citas c LEFT JOIN tratamientos t ON t.id = c.tratamiento_id WHERE c.id = $1`, [citaId]);
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 });
  if (c.exento) return { exento: true, faltan: [], paciente_id: c.paciente_id, plan_id: c.plan_tratamiento_id };
  if (!c.tratamiento_id) return { exento: false, faltan: ['tratamiento'], paciente_id: c.paciente_id, plan_id: null };

  let planId = c.plan_tratamiento_id;
  if (!planId && c.paciente_id) {
    const { rows } = await pool.query(
      `SELECT id FROM plan_tratamientos WHERE paciente_id = $1 AND tratamiento_id = $2 AND estatus = 'aceptado'`,
      [c.paciente_id, c.tratamiento_id]);
    if (rows.length === 1) {
      planId = rows[0].id;
      await pool.query('UPDATE citas SET plan_tratamiento_id = $1 WHERE id = $2', [planId, citaId]);
    }
  }

  const { rows: [p] } = planId
    ? await pool.query('SELECT estatus, consentimiento_firmado_id FROM plan_tratamientos WHERE id = $1', [planId])
    : { rows: [] };
  const faltan = [];
  if (!p || !['aceptado', 'completado'].includes(p.estatus)) faltan.push('presupuesto');
  const { rows: plantilla } = await pool.query(
    'SELECT 1 FROM consentimientos WHERE tratamiento_id = $1 AND activo LIMIT 1', [c.tratamiento_id]);
  if (plantilla.length && !p?.consentimiento_firmado_id) faltan.push('consentimiento');
  return { exento: false, faltan, paciente_id: c.paciente_id, plan_id: planId || null };
}

// El CI que se firma para un plan debe ser la plantilla del tratamiento de ese plan y del mismo paciente
async function validarConsentimientoPlan(planId, pacienteId, consentimientoId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM plan_tratamientos pt JOIN consentimientos ci ON ci.tratamiento_id = pt.tratamiento_id
     WHERE pt.id = $1 AND pt.paciente_id = $2 AND ci.id = $3`, [planId, pacienteId, consentimientoId]);
  return rows.length === 1;
}

async function ligarConsentimientoAPlan(firmadoId, planId) {
  await pool.query('UPDATE plan_tratamientos SET consentimiento_firmado_id = $1, updated_at = NOW() WHERE id = $2', [firmadoId, planId]);
}

const ETIQUETAS = { tratamiento: 'tratamiento en la cita', presupuesto: 'presupuesto firmado', consentimiento: 'consentimiento informado' };
const mensajeFaltan = faltan => `Falta: ${faltan.map(f => ETIQUETAS[f]).join(', ')}`;

module.exports = { requisitosProcedimiento, validarConsentimientoPlan, ligarConsentimientoAPlan, mensajeFaltan };
