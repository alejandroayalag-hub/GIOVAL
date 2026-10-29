const pool = require('../db/pool');

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

module.exports = { VALORACION_TIPOS, syncDesdeValoracion };
