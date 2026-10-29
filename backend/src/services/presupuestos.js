const pool = require('../db/pool');
const { encrypt, decrypt } = require('../utils/cifrado');
const { calcularItem, promoAplicable } = require('./promociones');

const err400 = msg => Object.assign(new Error(msg), { status: 400 });
const esDataUrlImagen = s => typeof s === 'string' && s.startsWith('data:image/');
const hoyMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

// Precio, sesiones y descuento se calculan aquí; lo que mande el cliente además de
// { plan_id, modalidad, promocion_id } se ignora.
async function crearPresupuesto({ paciente_id, items, firma, ip, user_agent }, userId) {
  if (!Array.isArray(items) || items.length === 0) throw err400('Elige al menos un tratamiento');
  if (!esDataUrlImagen(firma)) throw err400('Falta la firma de aceptación');
  const fecha = hoyMx();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const calculados = [];
    for (const it of items) {
      if (!['por_sesion', 'completo'].includes(it.modalidad)) throw err400('Modalidad inválida');
      const { rows: [p] } = await client.query(
        `SELECT pt.id, pt.paciente_id, pt.estatus, pt.sesiones_estimadas, pt.tratamiento_id,
                t.nombre AS tratamiento_nombre, t.precio::float AS precio
         FROM plan_tratamientos pt JOIN tratamientos t ON t.id = pt.tratamiento_id
         WHERE pt.id = $1 FOR UPDATE OF pt`, [it.plan_id]);
      if (!p || p.paciente_id !== Number(paciente_id)) throw err400('El tratamiento no corresponde al paciente');
      if (p.estatus !== 'sugerido') throw err400(`${p.tratamiento_nombre} ya no está pendiente de presupuesto`);
      if (p.precio == null) throw err400(`${p.tratamiento_nombre} no tiene precio en el catálogo`);
      let promo = null;
      if (it.promocion_id) {
        promo = await promoAplicable(it.promocion_id, p.tratamiento_id, it.modalidad, fecha);
        if (!promo) throw err400(`La promoción no aplica a ${p.tratamiento_nombre}`);
      }
      const descuento_pct = promo ? promo.descuento_pct : 0;
      const { subtotal } = calcularItem({ precio_unitario: p.precio, sesiones: p.sesiones_estimadas, descuento_pct });
      calculados.push({ plan: p, modalidad: it.modalidad, promo, descuento_pct, subtotal });
    }
    const total = Math.round(calculados.reduce((s, c) => s + c.subtotal, 0) * 100) / 100;

    const { rows: [pres] } = await client.query(
      `INSERT INTO presupuestos (paciente_id, fecha, total, firma, ip, user_agent, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [paciente_id, fecha, total, encrypt(firma), ip ?? null, user_agent ?? null, userId]);

    const salida = [];
    for (const c of calculados) {
      const { rows: [item] } = await client.query(
        `INSERT INTO presupuesto_items (presupuesto_id, plan_tratamiento_id, modalidad, sesiones, precio_unitario,
           promocion_id, descuento_pct, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [pres.id, c.plan.id, c.modalidad, c.plan.sesiones_estimadas, c.plan.precio, c.promo?.id ?? null, c.descuento_pct, c.subtotal]);
      await client.query(
        `UPDATE plan_tratamientos SET estatus = 'aceptado', presupuesto_item_id = $1, updated_at = NOW() WHERE id = $2`,
        [item.id, c.plan.id]);
      salida.push({
        id: item.id, plan_tratamiento_id: c.plan.id, tratamiento_id: c.plan.tratamiento_id,
        tratamiento_nombre: c.plan.tratamiento_nombre, modalidad: c.modalidad, sesiones: c.plan.sesiones_estimadas,
        precio_unitario: c.plan.precio, descuento_pct: c.descuento_pct, promocion_nombre: c.promo?.nombre ?? null,
        subtotal: c.subtotal,
      });
    }
    await client.query('COMMIT');
    return { id: pres.id, fecha, total, items: salida };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const ITEMS_SQL = `
  SELECT pi.id, pi.plan_tratamiento_id, pt.tratamiento_id, t.nombre AS tratamiento_nombre, pi.modalidad, pi.sesiones,
         pi.precio_unitario::float AS precio_unitario, pi.descuento_pct::float AS descuento_pct,
         pr.nombre AS promocion_nombre, pi.subtotal::float AS subtotal
  FROM presupuesto_items pi
  JOIN plan_tratamientos pt ON pt.id = pi.plan_tratamiento_id
  JOIN tratamientos t ON t.id = pt.tratamiento_id
  LEFT JOIN promociones pr ON pr.id = pi.promocion_id
  WHERE pi.presupuesto_id = $1 ORDER BY pi.id`;

async function getPresupuesto(id) {
  const { rows: [p] } = await pool.query(
    `SELECT pr.id, pr.paciente_id, to_char(pr.fecha, 'YYYY-MM-DD') AS fecha, pr.total::float AS total, pr.firma, pr.firmado_at,
            TRIM(CONCAT_WS(' ', pa.nombre, pa.apellido_paterno, pa.apellido_materno)) AS paciente_nombre,
            u.nombre AS elaboro
     FROM presupuestos pr
     JOIN pacientes pa ON pa.id = pr.paciente_id
     LEFT JOIN usuarios u ON u.id = pr.created_by
     WHERE pr.id = $1`, [id]);
  if (!p) return null;
  const { rows: items } = await pool.query(ITEMS_SQL, [id]);
  return { ...p, firma: decrypt(p.firma), items };
}

async function listarPorPaciente(pacienteId) {
  const { rows } = await pool.query(
    `SELECT id, to_char(fecha, 'YYYY-MM-DD') AS fecha, total::float AS total, firmado_at
     FROM presupuestos WHERE paciente_id = $1 ORDER BY id DESC`, [pacienteId]);
  return rows;
}

// Pase directo: la cita llega a tratamiento sin valoración previa → plan 'sugerido' al vuelo.
async function crearPlanDesdeCita(citaId, userId) {
  const { rows: [c] } = await pool.query(
    'SELECT id, paciente_id, tratamiento_id, plan_tratamiento_id FROM citas WHERE id = $1', [citaId]);
  if (!c) throw Object.assign(new Error('Cita no encontrada'), { status: 404 });
  if (c.plan_tratamiento_id) {
    return (await pool.query('SELECT * FROM plan_tratamientos WHERE id = $1', [c.plan_tratamiento_id])).rows[0];
  }
  if (!c.paciente_id) throw err400('Vincula la cita a un expediente primero');
  if (!c.tratamiento_id) throw err400('La cita no tiene tratamiento');
  const { rows: [plan] } = await pool.query(
    `INSERT INTO plan_tratamientos (paciente_id, tratamiento_id, sesiones_estimadas, created_by)
     VALUES ($1,$2,1,$3) RETURNING *`, [c.paciente_id, c.tratamiento_id, userId]);
  await pool.query('UPDATE citas SET plan_tratamiento_id = $1 WHERE id = $2', [plan.id, citaId]);
  return plan;
}

module.exports = { crearPresupuesto, getPresupuesto, listarPorPaciente, crearPlanDesdeCita };
