// Finanzas de farmacia: separadas de los movimientos de la clínica. Solo admin.
const pool = require('../db/pool');
const { filtroEmpresa, empresaEscritura } = require('../utils/empresa');

const rango = (q) => {
  if (!q.fecha_desde || !q.fecha_hasta) throw Object.assign(new Error('fecha_desde y fecha_hasta requeridas'), { status: 400 });
  return [q.fecha_desde, q.fecha_hasta];
};

exports.resumen = async (req, res, next) => {
  try {
    // $3 = empresa (null = consolidado). Caja física e inventario son compartidos: no se filtran.
    const fechas = [...rango(req.query), filtroEmpresa(req.query)];
    const { rows: [ventas] } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE estado = 'pagada')::int AS num_ventas,
              COALESCE(SUM(total) FILTER (WHERE estado = 'pagada'), 0)::numeric AS ingresos,
              COALESCE(SUM(total) FILTER (WHERE estado = 'pagada' AND metodo_pago = 'efectivo'), 0)::numeric AS ingresos_efectivo,
              COALESCE(SUM(total) FILTER (WHERE estado = 'pagada' AND metodo_pago = 'terminal'), 0)::numeric AS ingresos_terminal,
              COALESCE(SUM(total) FILTER (WHERE estado = 'pagada' AND metodo_pago = 'transferencia'), 0)::numeric AS ingresos_transferencia,
              COUNT(*) FILTER (WHERE estado = 'cancelada')::int AS num_canceladas,
              COALESCE(SUM(total) FILTER (WHERE estado = 'cancelada'), 0)::numeric AS monto_cancelado
       FROM farmacia_ventas WHERE DATE(fecha) BETWEEN $1 AND $2 AND ($3::text IS NULL OR empresa = $3)`, fechas);
    // costo_unitario se congela al vender; ventas viejas sin él usan el costo actual
    const { rows: [costo] } = await pool.query(
      `SELECT COALESCE(SUM(i.cantidad * COALESCE(i.costo_unitario, p.precio_costo)), 0)::numeric AS costo_vendido
       FROM farmacia_items_venta i
       JOIN farmacia_ventas v ON v.id = i.venta_id
       JOIN farmacia_productos p ON p.id = i.producto_id
       WHERE v.estado = 'pagada' AND DATE(v.fecha) BETWEEN $1 AND $2 AND ($3::text IS NULL OR v.empresa = $3)`, fechas);
    const { rows: egresosCat } = await pool.query(
      `SELECT categoria, SUM(monto)::numeric AS total FROM farmacia_egresos
       WHERE fecha BETWEEN $1 AND $2 AND ($3::text IS NULL OR empresa = $3) GROUP BY categoria`, fechas);
    const { rows: [cajas] } = await pool.query(
      `SELECT COALESCE(SUM(diferencia), 0)::numeric AS diferencias_caja,
              COUNT(*) FILTER (WHERE diferencia <> 0)::int AS cortes_con_diferencia
       FROM farmacia_caja WHERE estado = 'cerrada' AND DATE(fecha_cierre) BETWEEN $1 AND $2`, fechas.slice(0, 2));
    const { rows: [cxp] } = await pool.query(
      `SELECT COALESCE(SUM(importe_total - pagado) FILTER (WHERE estatus <> 'liquidada'), 0)::numeric AS por_pagar
       FROM cuentas_por_pagar WHERE area = 'farmacia' AND ($1::text IS NULL OR empresa = $1)`, [fechas[2]]);
    const { rows: [inventario] } = await pool.query(
      `SELECT COALESCE(SUM(stock * precio_costo), 0)::numeric AS valor_inventario,
              COUNT(*) FILTER (WHERE stock <= stock_minimo)::int AS productos_stock_bajo,
              COUNT(*) FILTER (WHERE NOT (precio_venta > 0))::int AS productos_sin_precio
       FROM farmacia_productos WHERE activo = true`);

    const egresos = egresosCat.reduce((s, e) => s + parseFloat(e.total), 0);
    const ingresos = parseFloat(ventas.ingresos);
    const costo_vendido = parseFloat(costo.costo_vendido);
    res.json({
      ...ventas, ...cajas, ...cxp, ...inventario,
      costo_vendido,
      utilidad_bruta: ingresos - costo_vendido,
      egresos,
      egresos_por_categoria: egresosCat,
      flujo_neto: ingresos - egresos,
    });
  } catch (err) { next(err); }
};

exports.listEgresos = async (req, res, next) => {
  try {
    const fechas = [...rango(req.query), filtroEmpresa(req.query)];
    const { rows } = await pool.query(
      `SELECT e.*, c.folio_factura, u.nombre AS registrado_por
       FROM farmacia_egresos e
       LEFT JOIN cuentas_por_pagar c ON c.id = e.cxp_id
       LEFT JOIN usuarios u ON u.id = e.created_by
       WHERE e.fecha BETWEEN $1 AND $2 AND ($3::text IS NULL OR e.empresa = $3) ORDER BY e.fecha DESC, e.id DESC`, fechas);
    res.json(rows);
  } catch (err) { next(err); }
};

// Si el egreso paga una cuenta por pagar de farmacia, suma a su pagado y ajusta estatus (misma transacción)
async function aplicarPagoCxp(client, cxp_id, delta, empresa = null) {
  const { rows: [c] } = await client.query(
    `SELECT * FROM cuentas_por_pagar WHERE id = $1 AND area = 'farmacia' FOR UPDATE`, [cxp_id]);
  if (!c) throw Object.assign(new Error('Cuenta por pagar de farmacia no encontrada'), { status: 400 });
  // Un pago no puede cruzar razones sociales (al borrar el egreso ya vienen iguales)
  if (empresa && c.empresa !== empresa) throw Object.assign(new Error('La factura pertenece a la otra empresa'), { status: 400 });
  const pagado = Math.round((parseFloat(c.pagado) + delta) * 100) / 100;
  if (pagado > parseFloat(c.importe_total) + 0.001) {
    throw Object.assign(new Error(`El pago excede el saldo de la factura (${(c.importe_total - c.pagado).toFixed(2)})`), { status: 400 });
  }
  const estatus = pagado <= 0 ? 'pendiente' : pagado >= parseFloat(c.importe_total) ? 'liquidada' : 'parcial';
  await client.query(
    'UPDATE cuentas_por_pagar SET pagado = $1, estatus = $2, updated_at = NOW() WHERE id = $3',
    [Math.max(pagado, 0), estatus, cxp_id]);
}

exports.createEgreso = async (req, res, next) => {
  const { fecha, categoria, concepto, forma_pago, cxp_id } = req.body;
  const monto = Number(req.body.monto);
  if (!concepto || !categoria || !(monto > 0)) {
    return res.status(400).json({ error: 'concepto, categoría y monto son requeridos' });
  }
  let empresa;
  try { empresa = empresaEscritura(req.body.empresa); } catch (err) { return next(err); }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (cxp_id) await aplicarPagoCxp(client, cxp_id, monto, empresa);
    const { rows: [egreso] } = await client.query(
      `INSERT INTO farmacia_egresos (fecha, categoria, concepto, monto, forma_pago, cxp_id, created_by, empresa)
       VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4, COALESCE($5, 'transferencia'), $6, $7, $8) RETURNING *`,
      [fecha || null, categoria, concepto, monto, forma_pago || null, cxp_id || null, req.user.id, empresa]);
    await client.query('COMMIT');
    res.status(201).json(egreso);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

exports.deleteEgreso = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [e] } = await client.query('DELETE FROM farmacia_egresos WHERE id = $1 RETURNING *', [req.params.id]);
    if (!e) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }
    if (e.cxp_id) await aplicarPagoCxp(client, e.cxp_id, -parseFloat(e.monto));
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
