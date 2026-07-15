// backend/src/models/finanzas.js
const pool = require('../db/pool');

const Categoria = {
  async list(soloActivas = false) {
    const where = soloActivas ? 'WHERE activo = true' : '';
    const { rows } = await pool.query(
      `SELECT * FROM categorias_movimiento ${where} ORDER BY tipo, nombre`
    );
    return rows;
  },

  async create({ nombre, tipo, color }) {
    const { rows } = await pool.query(
      `INSERT INTO categorias_movimiento (nombre, tipo, color) VALUES ($1,$2,$3) RETURNING *`,
      [nombre, tipo, color || '#887482']
    );
    return rows[0];
  },

  async update(id, { nombre, tipo, color, activo }) {
    const { rows } = await pool.query(
      `UPDATE categorias_movimiento SET
         nombre = COALESCE($1, nombre),
         tipo   = COALESCE($2, tipo),
         color  = COALESCE($3, color),
         activo = COALESCE($4, activo)
       WHERE id = $5 RETURNING *`,
      [nombre ?? null, tipo ?? null, color ?? null, activo ?? null, id]
    );
    return rows[0];
  },

  async tieneMovimientos(id) {
    const { rows } = await pool.query(
      'SELECT 1 FROM movimientos WHERE categoria_id = $1 LIMIT 1', [id]
    );
    return rows.length > 0;
  },

  async delete(id) {
    await pool.query('DELETE FROM categorias_movimiento WHERE id = $1', [id]);
  },
};

const Movimiento = {
  async list({ tipo, categoria_id, fecha_inicio, fecha_fin, forma_pago } = {}) {
    const conds = []; const vals = []; let i = 1;
    if (tipo)         { conds.push(`m.tipo = $${i++}`);          vals.push(tipo); }
    if (categoria_id) { conds.push(`m.categoria_id = $${i++}`);  vals.push(categoria_id); }
    if (fecha_inicio) { conds.push(`m.fecha >= $${i++}`);        vals.push(fecha_inicio); }
    if (fecha_fin)    { conds.push(`m.fecha <= $${i++}`);        vals.push(fecha_fin); }
    if (forma_pago)   { conds.push(`m.forma_pago = $${i++}`);    vals.push(forma_pago); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT m.*, c.nombre AS categoria_nombre, c.color AS categoria_color,
              u.nombre AS creado_por_nombre
       FROM movimientos m
       LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
       LEFT JOIN usuarios u ON u.id = m.created_by
       ${where}
       ORDER BY m.fecha DESC, m.created_at DESC`,
      vals
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM movimientos WHERE id = $1', [id]);
    return rows[0];
  },

  async create({ tipo, categoria_id, concepto, monto, forma_pago, fecha, notas, created_by, cita_id }) {
    const { rows } = await pool.query(
      `INSERT INTO movimientos (tipo, categoria_id, concepto, monto, forma_pago, fecha, notas, created_by, cita_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tipo, categoria_id || null, concepto, monto,
       forma_pago || 'efectivo',
       fecha || new Date().toISOString().split('T')[0],
       notas || null, created_by, cita_id || null]
    );
    return rows[0];
  },

  async update(id, { categoria_id, concepto, monto, forma_pago, fecha, notas }) {
    const { rows } = await pool.query(
      `UPDATE movimientos SET
         categoria_id = COALESCE($1, categoria_id),
         concepto     = COALESCE($2, concepto),
         monto        = COALESCE($3, monto),
         forma_pago   = COALESCE($4, forma_pago),
         fecha        = COALESCE($5, fecha),
         notas        = COALESCE($6, notas),
         updated_at   = NOW()
       WHERE id = $7 RETURNING *`,
      [categoria_id ?? null, concepto ?? null, monto ?? null,
       forma_pago ?? null, fecha ?? null, notas ?? null, id]
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM movimientos WHERE id = $1', [id]);
  },

  async resumenPorCategoria({ fecha_inicio, fecha_fin }) {
    const { rows } = await pool.query(
      `SELECT m.tipo, c.nombre AS categoria, c.color,
              COUNT(*) AS cantidad, SUM(m.monto) AS total
       FROM movimientos m
       LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
       WHERE m.fecha >= $1 AND m.fecha <= $2
       GROUP BY m.tipo, c.nombre, c.color
       ORDER BY m.tipo, total DESC`,
      [fecha_inicio, fecha_fin]
    );
    return rows;
  },

  async resumenPorMes({ fecha_inicio, fecha_fin }) {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes,
              SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos,
              SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END) AS egresos
       FROM movimientos
       WHERE fecha >= $1 AND fecha <= $2
       GROUP BY mes ORDER BY mes`,
      [fecha_inicio, fecha_fin]
    );
    return rows;
  },
};

const CorteCaja = {
  async calcularHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0) AS total_ingresos,
         COALESCE(SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END),0) AS total_egresos
       FROM movimientos WHERE fecha = $1`,
      [hoy]
    );
    const ti = parseFloat(rows[0].total_ingresos);
    const te = parseFloat(rows[0].total_egresos);
    return { fecha: hoy, total_ingresos: ti, total_egresos: te, saldo: ti - te };
  },

  async estaCerrado(fecha) {
    const { rows } = await pool.query(
      'SELECT id FROM cortes_caja WHERE fecha = $1', [fecha]
    );
    return rows.length > 0;
  },

  async cerrar({ notas, cerrado_por }) {
    const resumen = await CorteCaja.calcularHoy();
    const { rows } = await pool.query(
      `INSERT INTO cortes_caja (fecha, total_ingresos, total_egresos, saldo, notas, cerrado_por)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [resumen.fecha, resumen.total_ingresos, resumen.total_egresos,
       resumen.saldo, notas || null, cerrado_por]
    );
    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(
      `SELECT cc.*, u.nombre AS cerrado_por_nombre
       FROM cortes_caja cc
       LEFT JOIN usuarios u ON u.id = cc.cerrado_por
       ORDER BY cc.fecha DESC`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT cc.*, u.nombre AS cerrado_por_nombre
       FROM cortes_caja cc LEFT JOIN usuarios u ON u.id = cc.cerrado_por
       WHERE cc.id = $1`,
      [id]
    );
    return rows[0];
  },
};

const Reportes = {
  async estadoResultados(mes) {
    // mes = 'YYYY-MM'
    const movQ = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END), 0)::numeric AS ingresos_brutos,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' AND c.nombre = 'Insumos' THEN m.monto ELSE 0 END), 0)::numeric AS costo_materiales,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' AND c.nombre = 'Nómina'  THEN m.monto ELSE 0 END), 0)::numeric AS nomina_total,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' AND c.nombre IN ('Renta','Servicios') THEN m.monto ELSE 0 END), 0)::numeric AS costos_fijos,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END), 0)::numeric AS total_egresos
      FROM movimientos m
      LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
      WHERE TO_CHAR(m.fecha, 'YYYY-MM') = $1
    `, [mes]);

    const citasQ = await pool.query(`
      SELECT COUNT(*)::integer AS servicios_realizados
      FROM citas
      WHERE estatus = 'realizada' AND TO_CHAR(fecha_hora, 'YYYY-MM') = $1
    `, [mes]);

    const r = movQ.rows[0];
    const ingresos_brutos    = parseFloat(r.ingresos_brutos);
    const costo_materiales   = parseFloat(r.costo_materiales);
    const nomina_total       = parseFloat(r.nomina_total);
    const costos_fijos       = parseFloat(r.costos_fijos);
    const total_egresos      = parseFloat(r.total_egresos);
    const iva_estimado       = +(ingresos_brutos * 0.16).toFixed(2);
    const ingresos_netos     = +(ingresos_brutos - iva_estimado).toFixed(2);
    const utilidad_bruta     = +(ingresos_netos - costo_materiales).toFixed(2);
    const utilidad_operativa = +(utilidad_bruta - costos_fijos - nomina_total).toFixed(2);
    const servicios          = citasQ.rows[0].servicios_realizados;
    const ticket_promedio    = servicios > 0 ? +(ingresos_brutos / servicios).toFixed(2) : 0;
    const margen_bruto       = ingresos_netos > 0 ? +((utilidad_bruta / ingresos_netos) * 100).toFixed(1) : 0;
    const margen_neto        = ingresos_netos > 0 ? +((utilidad_operativa / ingresos_netos) * 100).toFixed(1) : 0;

    return {
      mes,
      ingresos_brutos, iva_estimado, ingresos_netos,
      costo_materiales, utilidad_bruta,
      costos_fijos, nomina_total, utilidad_operativa,
      total_egresos,
      servicios_realizados: servicios,
      ticket_promedio, margen_bruto, margen_neto,
    };
  },

  // Ganancia real por tratamiento (Fase 3 inventario):
  // ingreso = precio_cobrado (snapshot al cobrar), costo = Σ cita_insumos con costo snapshot.
  // Solo citas cobradas con precio_cobrado (las cobradas antes de Fase 2 no lo tienen — se excluyen).
  async gananciaTratamientos(mes) {
    const { rows } = await pool.query(`
      SELECT t.id AS tratamiento_id, t.nombre AS tratamiento,
             COUNT(*)::integer AS citas,
             COUNT(*) FILTER (WHERE NOT c.insumos_confirmados)::integer AS citas_sin_insumos,
             COALESCE(SUM(c.precio_cobrado), 0)::numeric AS ingreso,
             COALESCE(SUM(ci.costo), 0)::numeric AS costo_insumos,
             (COALESCE(SUM(c.precio_cobrado), 0) - COALESCE(SUM(ci.costo), 0))::numeric AS ganancia
      FROM citas c
      JOIN tratamientos t ON t.id = c.tratamiento_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(cantidad * costo_unidad), 0) AS costo
        FROM cita_insumos WHERE cita_id = c.id
      ) ci ON true
      WHERE c.cobrado = true
        AND c.precio_cobrado IS NOT NULL
        AND TO_CHAR(c.fecha_hora, 'YYYY-MM') = $1
      GROUP BY t.id, t.nombre
      ORDER BY ganancia DESC
    `, [mes]);

    const num = v => parseFloat(v);
    const tratamientos = rows.map(r => ({
      ...r,
      ingreso: num(r.ingreso),
      costo_insumos: num(r.costo_insumos),
      ganancia: num(r.ganancia),
      margen: num(r.ingreso) > 0 ? +((num(r.ganancia) / num(r.ingreso)) * 100).toFixed(1) : 0,
    }));

    const tot = (k) => +tratamientos.reduce((s, t) => s + t[k], 0).toFixed(2);
    return {
      mes,
      tratamientos,
      totales: {
        citas: tratamientos.reduce((s, t) => s + t.citas, 0),
        ingreso: tot('ingreso'),
        costo_insumos: tot('costo_insumos'),
        ganancia: tot('ganancia'),
        margen: tot('ingreso') > 0 ? +((tot('ganancia') / tot('ingreso')) * 100).toFixed(1) : 0,
      },
    };
  },

  async dashboardKPIs(mes) {
    const er = await Reportes.estadoResultados(mes);
    return {
      ingresos_netos:       er.ingresos_netos,
      total_egresos:        er.total_egresos,
      utilidad_bruta:       er.utilidad_bruta,
      ticket_promedio:      er.ticket_promedio,
      servicios_realizados: er.servicios_realizados,
      margen_bruto:         er.margen_bruto,
      nomina_total:         er.nomina_total,
      costo_materiales:     er.costo_materiales,
      ingresos_brutos:      er.ingresos_brutos,
    };
  },
};

module.exports = { Categoria, Movimiento, CorteCaja, Reportes };
