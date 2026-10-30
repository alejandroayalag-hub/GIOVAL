const pool = require('../db/pool');
const { ABONADO } = require('./abonos');

const VALORACION_TIPOS = ['val_01', 'val_01b', 'val_02', 'val_03', 'val_04', 'val_05', 'hist_lax'];

// Valoración → diagnóstico (paciente_diagnosticos) + planes 'sugerido'.
// Solo toca planes en 'sugerido' de esta valoración; aceptados/completados/cancelados nunca.
async function syncDesdeValoracion(doc, userId) {
  const plan = doc?.datos?.plan;
  if (!VALORACION_TIPOS.includes(doc?.tipo) || !plan) return doc;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cie10 = plan.diagnostico_cie10 || null;
    const texto = plan.diagnostico_texto?.trim() || null;
    if (cie10 || texto) {
      if (plan.diagnostico_id) {
        await client.query(
          'UPDATE paciente_diagnosticos SET cie10_codigo=$1, notas=$2 WHERE id=$3 AND paciente_id=$4',
          [cie10, texto, plan.diagnostico_id, doc.paciente_id]);
      } else {
        const { rows: [dx] } = await client.query(
          `INSERT INTO paciente_diagnosticos (paciente_id, cie10_codigo, fecha, notas, created_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [doc.paciente_id, cie10, doc.fecha, texto, userId]);
        plan.diagnostico_id = dx.id;
      }
    }

    const filas = (plan.tratamientos || []).filter(t => t.tratamiento_id);
    const { rows: sugeridos } = await client.query(
      `SELECT id FROM plan_tratamientos WHERE valoracion_id=$1 AND estatus='sugerido'`, [doc.id]);
    const sugeridoIds = new Set(sugeridos.map(r => r.id));
    const conservar = new Set();

    for (const t of filas) {
      const valores = [Number(t.tratamiento_id), Math.max(1, parseInt(t.sesiones) || 1),
        t.frecuencia || null, t.notas || null, plan.diagnostico_id || null];
      if (t.plan_id && sugeridoIds.has(t.plan_id)) {
        await client.query(
          `UPDATE plan_tratamientos SET tratamiento_id=$1, sesiones_estimadas=$2, frecuencia=$3,
             notas=$4, diagnostico_id=$5, updated_at=NOW() WHERE id=$6`,
          [...valores, t.plan_id]);
        conservar.add(t.plan_id);
      } else if (!t.plan_id) {
        const { rows: [nuevo] } = await client.query(
          `INSERT INTO plan_tratamientos (tratamiento_id, sesiones_estimadas, frecuencia, notas, diagnostico_id,
             paciente_id, valoracion_id, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [...valores, doc.paciente_id, doc.id, userId]);
        t.plan_id = nuevo.id;
        conservar.add(nuevo.id);
      }
      // plan_id de un plan ya no-sugerido: se deja tal cual (la fila se muestra bloqueada)
    }

    const borrar = [...sugeridoIds].filter(id => !conservar.has(id));
    if (borrar.length) await client.query('DELETE FROM plan_tratamientos WHERE id = ANY($1)', [borrar]);

    const { rows: [actualizado] } = await client.query(
      'UPDATE documentos_clinicos SET datos=$1 WHERE id=$2 RETURNING *', [JSON.stringify(doc.datos), doc.id]);
    await client.query('COMMIT');
    return actualizado;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const SESIONES_REALIZADAS = `(SELECT count(*)::int FROM citas c WHERE c.plan_tratamiento_id = pt.id AND c.estatus = 'realizada')`;

async function listarPorPaciente(pacienteId) {
  const { rows } = await pool.query(
    `SELECT pt.id, pt.tratamiento_id, t.nombre AS tratamiento_nombre, pt.sesiones_estimadas,
            ${SESIONES_REALIZADAS} AS sesiones_realizadas,
            pt.frecuencia, pt.notas, pt.estatus, pt.motivo_cancelacion,
            pt.valoracion_id, dc.tipo AS valoracion_tipo, dc.fecha AS valoracion_fecha,
            pt.diagnostico_id,
            COALESCE(NULLIF(CONCAT_WS(' · ', pd.cie10_codigo, cie.descripcion), ''), pd.notas) AS diagnostico_label,
            (SELECT json_build_object('id', c.id, 'fecha_hora', c.fecha_hora) FROM citas c
              WHERE c.plan_tratamiento_id = pt.id AND c.estatus = 'pendiente' AND c.fecha_hora >= NOW()
              ORDER BY c.fecha_hora LIMIT 1) AS proxima_cita,
            pt.created_at,
            pi.id AS presupuesto_item_id, pi.presupuesto_id, pi.modalidad, pi.subtotal::float AS subtotal,
            CASE WHEN pi.id IS NOT NULL THEN ${ABONADO('pi.id')}::float END AS abonado, pi.descuento_pct::float AS descuento_pct,
            pt.consentimiento_firmado_id,
            EXISTS (SELECT 1 FROM consentimientos ci WHERE ci.tratamiento_id = pt.tratamiento_id AND ci.activo) AS requiere_ci
     FROM plan_tratamientos pt
     JOIN tratamientos t ON t.id = pt.tratamiento_id
     LEFT JOIN presupuesto_items pi ON pi.id = pt.presupuesto_item_id
     LEFT JOIN documentos_clinicos dc ON dc.id = pt.valoracion_id
     LEFT JOIN paciente_diagnosticos pd ON pd.id = pt.diagnostico_id
     LEFT JOIN cie10_catalogo cie ON cie.codigo = pd.cie10_codigo
     WHERE pt.paciente_id = $1
     ORDER BY pt.created_at DESC, pt.id DESC`,
    [pacienteId]);
  return rows;
}

async function actualizarAvance(planId) {
  if (!planId) return;
  await pool.query(
    `UPDATE plan_tratamientos pt SET estatus = 'completado', updated_at = NOW()
     WHERE pt.id = $1 AND pt.estatus = 'aceptado' AND ${SESIONES_REALIZADAS} >= pt.sesiones_estimadas`,
    [planId]);
}

async function historial(pacienteId) {
  const { rows: sesiones } = await pool.query(
    `SELECT c.id AS cita_id, c.fecha_hora, t.nombre AS tratamiento_nombre,
            TRIM(CONCAT(COALESCE(e.nombre,''), ' ', COALESCE(e.apellido_paterno,''))) AS empleada_nombre,
            c.plan_tratamiento_id AS plan_id,
            CASE WHEN c.plan_tratamiento_id IS NOT NULL THEN
              (SELECT count(*)::int FROM citas c2 WHERE c2.plan_tratamiento_id = c.plan_tratamiento_id
                 AND c2.estatus = 'realizada' AND (c2.fecha_hora, c2.id) <= (c.fecha_hora, c.id)) END AS sesion_n,
            pt.sesiones_estimadas,
            COALESCE((SELECT json_agg(json_build_object('id', d.id, 'tipo', d.tipo, 'fecha', d.fecha) ORDER BY d.id)
                      FROM documentos_clinicos d WHERE d.cita_id = c.id AND d.paciente_id = c.paciente_id
                        AND (d.tipo LIKE 'proc\\_%' OR d.tipo LIKE 'bit\\_%')), '[]') AS documentos
     FROM citas c
     LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
     LEFT JOIN empleados e ON e.id = c.empleada_id
     LEFT JOIN plan_tratamientos pt ON pt.id = c.plan_tratamiento_id
     WHERE c.paciente_id = $1 AND c.estatus = 'realizada'
       AND (t.nombre IS NULL OR t.nombre NOT ILIKE 'valoraci%')
     ORDER BY c.fecha_hora DESC`,
    [pacienteId]);
  const { rows: sin_sesion } = await pool.query(
    `SELECT id, tipo, fecha FROM documentos_clinicos
     WHERE paciente_id = $1 AND cita_id IS NULL AND (tipo LIKE 'proc\\_%' OR tipo LIKE 'bit\\_%')
     ORDER BY fecha DESC, id DESC`,
    [pacienteId]);
  return { sesiones, sin_sesion };
}

async function validarPlanDeCita(planId, pacienteId) {
  if (!planId) return true;
  const { rows } = await pool.query('SELECT 1 FROM plan_tratamientos WHERE id=$1 AND paciente_id=$2', [planId, pacienteId]);
  return rows.length === 1;
}

async function citaDePaciente(citaId, pacienteId) {
  if (!citaId) return true;
  const { rows } = await pool.query('SELECT 1 FROM citas WHERE id=$1 AND paciente_id=$2', [citaId, pacienteId]);
  return rows.length === 1;
}

module.exports = { citaDePaciente, VALORACION_TIPOS, syncDesdeValoracion, listarPorPaciente, actualizarAvance, historial, validarPlanDeCita };
