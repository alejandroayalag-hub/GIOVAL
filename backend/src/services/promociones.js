const pool = require('../db/pool');

const round2 = n => Math.round(n * 100) / 100;

// Única fórmula de precio (el frontend tiene una copia solo para vista previa).
function calcularItem({ precio_unitario, sesiones, descuento_pct }) {
  return { subtotal: round2(Number(precio_unitario) * Number(sesiones) * (1 - Number(descuento_pct || 0) / 100)) };
}

const err400 = msg => Object.assign(new Error(msg), { status: 400 });

const SELECT_PROMO = `
  SELECT p.id, p.nombre, p.descuento_pct::float AS descuento_pct, p.solo_completo, p.activo,
         to_char(p.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, to_char(p.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
         COALESCE(array_agg(pt.tratamiento_id ORDER BY pt.tratamiento_id) FILTER (WHERE pt.tratamiento_id IS NOT NULL), '{}') AS tratamiento_ids
  FROM promociones p
  LEFT JOIN promocion_tratamientos pt ON pt.promocion_id = p.id`;

async function promosVigentes(tratamientoIds, fecha) {
  const { rows } = await pool.query(
    `${SELECT_PROMO}
     WHERE p.activo AND $2::date BETWEEN p.fecha_inicio AND p.fecha_fin
       AND EXISTS (SELECT 1 FROM promocion_tratamientos x WHERE x.promocion_id = p.id AND x.tratamiento_id = ANY($1))
     GROUP BY p.id ORDER BY p.descuento_pct DESC`,
    [tratamientoIds, fecha]);
  return rows;
}

async function promoAplicable(promocionId, tratamientoId, modalidad, fecha) {
  const promo = (await promosVigentes([tratamientoId], fecha)).find(p => p.id === Number(promocionId));
  if (!promo || (promo.solo_completo && modalidad !== 'completo')) return null;
  return promo;
}

async function obtener(id, db = pool) {
  const { rows } = await db.query(`${SELECT_PROMO} WHERE p.id = $1 GROUP BY p.id`, [id]);
  return rows[0] || null;
}

async function listar() {
  const { rows } = await pool.query(`${SELECT_PROMO} GROUP BY p.id ORDER BY p.fecha_inicio DESC, p.id DESC`);
  return rows;
}

function validar({ nombre, descuento_pct, fecha_inicio, fecha_fin, tratamiento_ids }) {
  if (!nombre?.trim()) throw err400('El nombre es obligatorio');
  const pct = Number(descuento_pct);
  if (!(pct > 0 && pct <= 100)) throw err400('El descuento debe estar entre 1 y 100%');
  if (!fecha_inicio || !fecha_fin || fecha_fin < fecha_inicio) throw err400('Revisa las fechas de vigencia');
  if (!Array.isArray(tratamiento_ids) || tratamiento_ids.length === 0) throw err400('Elige al menos un tratamiento');
}

async function guardar(id, data, userId) {
  validar(data);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const valores = [data.nombre.trim(), Number(data.descuento_pct), data.fecha_inicio, data.fecha_fin, !!data.solo_completo];
    let promoId = id;
    if (id) {
      const { rowCount } = await client.query(
        `UPDATE promociones SET nombre=$1, descuento_pct=$2, fecha_inicio=$3, fecha_fin=$4, solo_completo=$5 WHERE id=$6`,
        [...valores, id]);
      if (!rowCount) throw Object.assign(new Error('Promoción no encontrada'), { status: 404 });
      await client.query('DELETE FROM promocion_tratamientos WHERE promocion_id=$1', [id]);
    } else {
      const { rows: [p] } = await client.query(
        `INSERT INTO promociones (nombre, descuento_pct, fecha_inicio, fecha_fin, solo_completo, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [...valores, userId]);
      promoId = p.id;
    }
    await client.query(
      `INSERT INTO promocion_tratamientos (promocion_id, tratamiento_id) SELECT $1, unnest($2::int[])`,
      [promoId, [...new Set(data.tratamiento_ids.map(Number))]]);
    const promo = await obtener(promoId, client);
    await client.query('COMMIT');
    return promo;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const crear = (data, userId) => guardar(null, data, userId);
const actualizar = (id, data) => guardar(Number(id), data, null);

async function desactivar(id) {
  await pool.query('UPDATE promociones SET activo = false WHERE id = $1', [id]);
}

module.exports = { calcularItem, promosVigentes, promoAplicable, listar, crear, actualizar, desactivar };
