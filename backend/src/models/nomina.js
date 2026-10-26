const pool = require('../db/pool');

const Nomina = {
  async list(mes, empresa = null) {
    const vals  = [empresa];
    let where = 'WHERE ($1::text IS NULL OR n.empresa = $1)';
    if (mes) { vals.push(mes); where += ' AND n.mes = $2'; }
    const { rows } = await pool.query(
      `SELECT n.*,
              (n.sueldo_base + n.comision + n.bono)::numeric AS total_empleado,
              (n.sueldo_base * 0.25)::numeric AS costo_imss_infonavit,
              (n.sueldo_base + n.comision + n.bono + n.sueldo_base * 0.25)::numeric AS costo_total_empresa,
              e.nombre AS empleado_nombre
       FROM nomina_mensual n
       LEFT JOIN empleados e ON e.id = n.empleado_id
       ${where}
       ORDER BY n.mes DESC, n.nombre_rol`,
      vals
    );
    return rows;
  },

  async create({ mes, empleado_id, nombre_rol, sueldo_base, comision, bono, rfc, nss, observaciones, empresa }) {
    const { rows } = await pool.query(
      `INSERT INTO nomina_mensual (mes, empleado_id, nombre_rol, sueldo_base, comision, bono, rfc, nss, observaciones, empresa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [mes, empleado_id || null, nombre_rol, sueldo_base || 0,
       comision || 0, bono || 0, rfc || null, nss || null, observaciones || null, empresa]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['nombre_rol','sueldo_base','comision','bono','rfc','nss','observaciones','empleado_id','empresa'];
    const sets = []; const vals = []; let i = 1;
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(fields[k]); }
    }
    if (!sets.length) return await Nomina.list(null).then(r => r.find(x => x.id == id));
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE nomina_mensual SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM nomina_mensual WHERE id = $1', [id]);
  },

  async resumenMes(mes, empresa = null) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(sueldo_base + comision + bono), 0)::numeric AS total_bruto,
         COALESCE(SUM(sueldo_base * 0.25), 0)::numeric AS total_cargas_sociales,
         COALESCE(SUM(sueldo_base + comision + bono + sueldo_base * 0.25), 0)::numeric AS costo_total_empresa,
         COUNT(*)::integer AS empleados
       FROM nomina_mensual WHERE mes = $1 AND ($2::text IS NULL OR empresa = $2)`,
      [mes, empresa]
    );
    return rows[0];
  },
};

module.exports = { Nomina };
