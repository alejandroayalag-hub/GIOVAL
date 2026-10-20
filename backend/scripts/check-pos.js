// Prueba del punto de venta de farmacia contra la base LOCAL. Deja la base como estaba.
// Uso: node scripts/check-pos.js
require('dotenv').config();
const assert = require('assert');
const pool = require('../src/db/pool');
const runMigrations = require('../src/db/migrate');
const Venta = require('../src/models/farmaciaVenta');
const Caja = require('../src/models/farmaciaCaja');
const fin = require('../src/controllers/finanzasFarmaciaController');

// Llama un handler express y regresa { status, body }
const call = (handler, req) => new Promise((resolve) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: b }); } };
  handler({ query: {}, params: {}, body: {}, user: { id: req.userId, rol: 'admin' }, ...req }, res, (err) => resolve({ status: err.status || 500, body: { error: err.message } }));
});

(async () => {
  if (process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') throw new Error('Solo contra base local');
  await runMigrations();
  const { rows: [u] } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Test POS', 'test-pos@local', 'x', 'farmacia') RETURNING id`);
  const { rows: [p] } = await pool.query(
    `INSERT INTO farmacia_productos (nombre, codigo_proveedor, precio_costo, precio_venta, stock) VALUES ('TEST POS', 'T', 60, 100, 5) RETURNING id`);
  const { rows: [cxp] } = await pool.query(
    `INSERT INTO cuentas_por_pagar (concepto, importe_total, area) VALUES ('TEST POS factura', 500, 'farmacia') RETURNING id`);
  const stock = async () => (await pool.query('SELECT stock FROM farmacia_productos WHERE id = $1', [p.id])).rows[0].stock;
  const movsAntes = (await pool.query('SELECT COUNT(*) FROM movimientos')).rows[0].count;

  try {
    const caja = await Caja.abrir(u.id, 200);
    await assert.rejects(Caja.abrir(u.id, 0), /abierta/);

    // Venta: 2 + 1 del mismo producto se juntan
    const v = await Venta.checkout({ empleado_id: u.id, caja_id: caja.id, metodo_pago: 'efectivo',
      items: [{ producto_id: p.id, cantidad: 2 }, { producto_id: p.id, cantidad: 1 }] });
    assert.equal(parseFloat(v.total), 300);
    assert.equal(await stock(), 2);

    // Validaciones: no se toca stock
    await assert.rejects(Venta.checkout({ empleado_id: u.id, caja_id: caja.id, metodo_pago: 'efectivo', items: [{ producto_id: p.id, cantidad: -1 }] }), /Cantidad/);
    await assert.rejects(Venta.checkout({ empleado_id: u.id, caja_id: caja.id, metodo_pago: 'efectivo', items: [{ producto_id: p.id, cantidad: 3 }] }), /Stock insuficiente/);
    await assert.rejects(Venta.checkout({ empleado_id: u.id, caja_id: caja.id, metodo_pago: 'bitcoin', items: [{ producto_id: p.id, cantidad: 1 }] }), /Método/);
    assert.equal(await stock(), 2);

    // Segunda venta con terminal, luego se cancela → stock regresa; no se cancela dos veces
    const v2 = await Venta.checkout({ empleado_id: u.id, caja_id: caja.id, metodo_pago: 'terminal', items: [{ producto_id: p.id, cantidad: 1 }] });
    assert.equal(await stock(), 1);
    await Venta.cancelar(v2.id, u.id);
    assert.equal(await stock(), 2);
    await assert.rejects(Venta.cancelar(v2.id, u.id), /pagadas/);

    // Corte: esperado 200 + 300 efectivo = 500; contó 490 → -10
    const t = await Caja.totales(caja.id);
    assert.equal(parseFloat(t.ventas_efectivo), 300);
    assert.equal(parseFloat(t.ventas_terminal), 0);
    const cerrada = await Caja.cerrar(caja.id, 490);
    assert.equal(parseFloat(cerrada.efectivo_esperado), 500);
    assert.equal(parseFloat(cerrada.diferencia), -10);

    // Segundo turno: abrir y cerrar otra vez (antes tronaba por UNIQUE)
    const caja2 = await Caja.abrir(u.id, 0);
    await Caja.cerrar(caja2.id, 0);

    // Egreso que paga factura de farmacia → pagado y estatus; borrar lo revierte; no excede saldo
    const hoy = new Date().toISOString().slice(0, 10);
    let r = await call(fin.createEgreso, { userId: u.id, body: { categoria: 'compra', concepto: 'TEST POS pago', monto: 200, cxp_id: cxp.id } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const cx = async () => (await pool.query('SELECT pagado, estatus FROM cuentas_por_pagar WHERE id = $1', [cxp.id])).rows[0];
    assert.deepEqual(await cx(), { pagado: '200.00', estatus: 'parcial' });
    const r2 = await call(fin.createEgreso, { userId: u.id, body: { categoria: 'compra', concepto: 'TEST POS pago', monto: 400, cxp_id: cxp.id } });
    assert.equal(r2.status, 400);
    const res = await call(fin.resumen, { userId: u.id, query: { fecha_desde: hoy, fecha_hasta: hoy } });
    assert.ok(parseFloat(res.body.ingresos) >= 300 && parseFloat(res.body.costo_vendido) >= 180, JSON.stringify(res.body));
    await call(fin.deleteEgreso, { userId: u.id, params: { id: r.body.id } });
    assert.deepEqual(await cx(), { pagado: '0.00', estatus: 'pendiente' });

    // Finanzas de la clínica intactas
    assert.equal((await pool.query('SELECT COUNT(*) FROM movimientos')).rows[0].count, movsAntes);
    console.log('✅ check-pos OK');
  } finally {
    await pool.query('DELETE FROM farmacia_items_venta WHERE producto_id = $1', [p.id]);
    await pool.query('DELETE FROM farmacia_ventas WHERE empleado_id = $1', [u.id]);
    await pool.query('DELETE FROM farmacia_caja WHERE empleado_id = $1', [u.id]);
    await pool.query('DELETE FROM farmacia_egresos WHERE cxp_id = $1 OR created_by = $2', [cxp.id, u.id]);
    await pool.query('DELETE FROM cuentas_por_pagar WHERE id = $1', [cxp.id]);
    await pool.query('DELETE FROM farmacia_productos WHERE id = $1', [p.id]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [u.id]);
    await pool.end();
  }
})().catch((e) => { console.error('❌', e); process.exit(1); });
