const pool = require('../db/pool');

const Nomina = {
  async list(mes) {
    const where = mes ? 'WHERE n.mes = $1' : '';
    const vals  = mes ? [mes] : [];
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

  async create({ mes, empleado_id, nombre_rol, sueldo_base, comision, bono, rfc, nss, observaciones }) {
    const { rows } = await pool.query(
      `INSERT INTO nomina_mensual (mes, empleado_id, nombre_rol, sueldo_base, comision, bono, rfc, nss, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [mes, empleado_id || null, nombre_rol, sueldo_base || 0,
       comision || 0, bono || 0, rfc || null, nss || null, observaciones || null]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['nombre_rol','sueldo_base','comision','bono','rfc','nss','observaciones','empleado_id'];
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

  async resumenMes(mes) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(sueldo_base + comision + bono), 0)::numeric AS total_bruto,
         COALESCE(SUM(sueldo_base * 0.25), 0)::numeric AS total_cargas_sociales,
         COALESCE(SUM(sueldo_base + comision + bono + sueldo_base * 0.25), 0)::numeric AS costo_total_empresa,
         COUNT(*)::integer AS empleados
       FROM nomina_mensual WHERE mes = $1`,
      [mes]
    );
    return rows[0];
  },
};

module.exports = { Nomina };
