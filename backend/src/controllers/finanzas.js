// backend/src/controllers/finanzas.js
const { Categoria, Movimiento, CorteCaja, Reportes } = require('../models/finanzas');

// ── Categorías ────────────────────────────────────────────────────────────────

exports.listCategorias = async (req, res, next) => {
  try {
    const soloActivas = req.user.rol !== 'admin';
    res.json(await Categoria.list(soloActivas));
  } catch (err) { next(err); }
};

exports.createCategoria = async (req, res, next) => {
  try {
    const { nombre, tipo, color } = req.body;
    if (!nombre || !tipo) return res.status(400).json({ error: 'nombre y tipo son requeridos' });
    if (!['ingreso','egreso','ambos'].includes(tipo))
      return res.status(400).json({ error: 'tipo inválido' });
    res.status(201).json(await Categoria.create({ nombre, tipo, color }));
  } catch (err) { next(err); }
};

exports.updateCategoria = async (req, res, next) => {
  try {
    const { tipo } = req.body;
    if (tipo && !['ingreso','egreso','ambos'].includes(tipo))
      return res.status(400).json({ error: 'tipo inválido' });
    const cat = await Categoria.update(req.params.id, req.body);
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(cat);
  } catch (err) { next(err); }
};

exports.deleteCategoria = async (req, res, next) => {
  try {
    const tieneMovs = await Categoria.tieneMovimientos(req.params.id);
    if (tieneMovs) {
      await Categoria.update(req.params.id, { activo: false });
      return res.json({ mensaje: 'Categoría desactivada (tiene movimientos asociados)' });
    }
    await Categoria.delete(req.params.id);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (err) { next(err); }
};

// ── Movimientos ───────────────────────────────────────────────────────────────

exports.listMovimientos = async (req, res, next) => {
  try {
    const { tipo, categoria_id, fecha_inicio, fecha_fin, forma_pago } = req.query;
    res.json(await Movimiento.list({ tipo, categoria_id, fecha_inicio, fecha_fin, forma_pago }));
  } catch (err) { next(err); }
};

exports.resumenMovimientos = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin)
      return res.status(400).json({ error: 'fecha_inicio y fecha_fin son requeridos' });
    const [porCategoria, porMes] = await Promise.all([
      Movimiento.resumenPorCategoria({ fecha_inicio, fecha_fin }),
      Movimiento.resumenPorMes({ fecha_inicio, fecha_fin }),
    ]);
    res.json({ porCategoria, porMes });
  } catch (err) { next(err); }
};

exports.createMovimiento = async (req, res, next) => {
  try {
    const { tipo, categoria_id, concepto, monto, forma_pago, fecha, notas, cita_id } = req.body;
    if (!tipo || !concepto || !monto)
      return res.status(400).json({ error: 'tipo, concepto y monto son requeridos' });
    if (!['ingreso','egreso'].includes(tipo))
      return res.status(400).json({ error: 'tipo inválido' });
    if (parseFloat(monto) <= 0)
      return res.status(400).json({ error: 'monto debe ser mayor a 0' });
    const fechaMov = fecha || new Date().toISOString().split('T')[0];
    if (await CorteCaja.estaCerrado(fechaMov))
      return res.status(409).json({ error: 'El corte de esa fecha ya está cerrado' });
    const pool = require('../db/pool');
    const mov = await Movimiento.create({ tipo, categoria_id, concepto, monto, forma_pago, fecha: fechaMov, notas, created_by: req.user.id, cita_id });
    if (cita_id) {
      await pool.query('UPDATE citas SET cobrado = true WHERE id = $1', [cita_id]);
      await pool.query(
        `UPDATE flujo_paciente
         SET estatus = 'completado', hora_completado = NOW(), updated_at = NOW()
         WHERE cita_id = $1 AND estatus = 'en_caja'`,
        [cita_id]
      );
    }
    res.status(201).json(mov);
  } catch (err) { next(err); }
};

exports.updateMovimiento = async (req, res, next) => {
  try {
    if (req.body.monto !== undefined && parseFloat(req.body.monto) <= 0)
      return res.status(400).json({ error: 'monto debe ser mayor a 0' });
    const existing = await Movimiento.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (await CorteCaja.estaCerrado(existing.fecha))
      return res.status(409).json({ error: 'El corte de esa fecha ya está cerrado' });
    res.json(await Movimiento.update(req.params.id, req.body));
  } catch (err) { next(err); }
};

exports.deleteMovimiento = async (req, res, next) => {
  try {
    const existing = await Movimiento.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (await CorteCaja.estaCerrado(existing.fecha))
      return res.status(409).json({ error: 'El corte de esa fecha ya está cerrado' });
    await Movimiento.delete(req.params.id);
    res.json({ mensaje: 'Movimiento eliminado' });
  } catch (err) { next(err); }
};

// ── Cortes de caja ────────────────────────────────────────────────────────────

exports.corteHoy = async (req, res, next) => {
  try {
    const resumen = await CorteCaja.calcularHoy();
    const cerrado = await CorteCaja.estaCerrado(resumen.fecha);
    res.json({ ...resumen, cerrado });
  } catch (err) { next(err); }
};

exports.cerrarCorte = async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    if (await CorteCaja.estaCerrado(hoy))
      return res.status(409).json({ error: 'El corte de hoy ya está cerrado' });
    res.status(201).json(await CorteCaja.cerrar({ notas: req.body.notas, cerrado_por: req.user.id }));
  } catch (err) { next(err); }
};

exports.listCortes = async (req, res, next) => {
  try { res.json(await CorteCaja.list()); } catch (err) { next(err); }
};

exports.getCorte = async (req, res, next) => {
  try {
    const corte = await CorteCaja.findById(req.params.id);
    if (!corte) return res.status(404).json({ error: 'Corte no encontrado' });
    res.json(corte);
  } catch (err) { next(err); }
};

// ── Reportes avanzados ────────────────────────────────────────────────────────

exports.estadoResultados = async (req, res, next) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    res.json(await Reportes.estadoResultados(mes));
  } catch (err) { next(err); }
};

exports.dashboardKPIs = async (req, res, next) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    res.json(await Reportes.dashboardKPIs(mes));
  } catch (err) { next(err); }
};
