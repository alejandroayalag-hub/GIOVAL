// backend/src/scripts/test_abonos.js — Fase 3: abonos, saldo, sesión cubierta por paquete, aviso 50%
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const assert = require('assert');
const pool = require('../db/pool');

const FIRMA = 'data:image/png;base64,iVBORw0KGgo=';
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

async function fixtures() {
  const { rows: ts } = await pool.query(
    `INSERT INTO tratamientos (nombre, precio) VALUES ('TEST AB paquete', 1000), ('TEST AB sesion', 500) RETURNING id`);
  const { rows: [pa] } = await pool.query('SELECT id FROM pacientes ORDER BY id LIMIT 1');
  return { t1: ts[0].id, t2: ts[1].id, pa: pa.id };
}
async function limpiar(f) {
  const ts = [[f.t1, f.t2]];
  await pool.query(`DELETE FROM movimientos WHERE presupuesto_item_id IN (SELECT pi.id FROM presupuesto_items pi
    JOIN plan_tratamientos pt ON pt.id = pi.plan_tratamiento_id WHERE pt.tratamiento_id = ANY($1))`, ts);
  await pool.query('DELETE FROM movimientos WHERE cita_id IN (SELECT id FROM citas WHERE tratamiento_id = ANY($1))', ts);
  await pool.query('UPDATE plan_tratamientos SET presupuesto_item_id = NULL WHERE tratamiento_id = ANY($1)', ts);
  await pool.query('DELETE FROM presupuesto_items WHERE plan_tratamiento_id IN (SELECT id FROM plan_tratamientos WHERE tratamiento_id = ANY($1))', ts);
  await pool.query('DELETE FROM presupuestos WHERE id NOT IN (SELECT presupuesto_id FROM presupuesto_items)');
  await pool.query('DELETE FROM citas WHERE tratamiento_id = ANY($1)', ts);
  await pool.query('DELETE FROM plan_tratamientos WHERE tratamiento_id = ANY($1)', ts);
  await pool.query('DELETE FROM promociones WHERE nombre LIKE $1', ['TEST AB%']);
  await pool.query('DELETE FROM tratamientos WHERE id = ANY($1)', ts);
}
async function cita(f, tratamientoId, planId, minutosAtras, estatus = 'realizada') {
  const { rows: [c] } = await pool.query(
    `INSERT INTO citas (nombre_paciente, paciente_id, tratamiento_id, plan_tratamiento_id, fecha_hora, estatus)
     VALUES ('T',$1,$2,$3, NOW() - make_interval(mins => $4), $5) RETURNING id`,
    [f.pa, tratamientoId, planId, minutosAtras, estatus]);
  return c.id;
}

async function run() {
  const { rows: col } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name='movimientos' AND column_name='presupuesto_item_id'`);
  assert.strictEqual(col.length, 1, 'falta movimientos.presupuesto_item_id');

  const A = require('../services/abonos');
  // aviso 50%: desde la sesión ⌈n/2⌉ si lo abonado no llega a la mitad del subtotal
  assert.strictEqual(A.aviso50({ sesion_n: 2, sesiones: 4, subtotal: 4000, abonado: 1000 }), true);
  assert.strictEqual(A.aviso50({ sesion_n: 2, sesiones: 4, subtotal: 4000, abonado: 2000 }), false);
  assert.strictEqual(A.aviso50({ sesion_n: 1, sesiones: 4, subtotal: 4000, abonado: 0 }), false);
  assert.strictEqual(A.aviso50({ sesion_n: 2, sesiones: 3, subtotal: 3000, abonado: 0 }), true);
  assert.strictEqual(A.aviso50({ sesion_n: 1, sesiones: 1, subtotal: 900, abonado: 0 }), true);

  const { crearPresupuesto } = require('../services/presupuestos');
  const Promos = require('../services/promociones');
  const f = await fixtures();
  try {
    const promo = await Promos.crear({ nombre: 'TEST AB 10', descuento_pct: 10, fecha_inicio: hoy(), fecha_fin: hoy(),
      solo_completo: false, tratamiento_ids: [f.t2] }, null);
    const mk = async (t, n) => (await pool.query(
      `INSERT INTO plan_tratamientos (paciente_id, tratamiento_id, sesiones_estimadas) VALUES ($1,$2,$3) RETURNING id`,
      [f.pa, t, n])).rows[0].id;
    const pPaq = await mk(f.t1, 4), pSes = await mk(f.t2, 2);
    const pres = await crearPresupuesto({ paciente_id: f.pa, firma: FIRMA, items: [
      { plan_id: pPaq, modalidad: 'completo' }, { plan_id: pSes, modalidad: 'por_sesion', promocion_id: promo.id },
    ] }, null);
    const itPaq = pres.items.find(i => i.plan_tratamiento_id === pPaq).id;
    const itSes = pres.items.find(i => i.plan_tratamiento_id === pSes).id;

    const c1 = await cita(f, f.t1, pPaq, 60);
    let paq = await A.paqueteDeCita(c1);
    assert.deepStrictEqual([paq.presupuesto_item_id, paq.subtotal, paq.abonado, paq.saldo, paq.sesion_n, paq.sesiones, paq.precio_sesion, paq.aviso_50],
      [itPaq, 4000, 0, 4000, 1, 4, 1000, false]);

    // abono: queda como ingreso ligado al item; no puede exceder saldo ni ser 0; no aplica a pago por sesión
    const { movimiento, estado } = await A.registrarAbono({ presupuesto_item_id: itPaq, monto: 1500, forma_pago: 'efectivo', empresa: 'elys' }, null);
    assert.deepStrictEqual([movimiento.tipo, Number(movimiento.monto), movimiento.empresa, movimiento.presupuesto_item_id], ['ingreso', 1500, 'elys', itPaq]);
    assert.ok(movimiento.concepto.includes('TEST AB paquete'));
    assert.deepStrictEqual([estado.abonado, estado.saldo], [1500, 2500]);
    await assert.rejects(A.registrarAbono({ presupuesto_item_id: itPaq, monto: 3000, forma_pago: 'efectivo' }, null), e => e.status === 400 && /saldo/.test(e.message));
    await assert.rejects(A.registrarAbono({ presupuesto_item_id: itPaq, monto: 0 }, null), e => e.status === 400);
    await assert.rejects(A.registrarAbono({ presupuesto_item_id: itSes, monto: 100 }, null), e => e.status === 400);
    await assert.rejects(A.registrarAbono({ presupuesto_item_id: itPaq, monto: 100, empresa: 'otra' }, null), e => e.status === 400);

    // sesión cubierta por paquete: cobrada sin cobro nuevo, ingreso = subtotal ÷ sesiones
    await A.cubrirConPaquete(c1);
    const { rows: [c1db] } = await pool.query('SELECT cobrado, precio_cobrado::float AS pc FROM citas WHERE id=$1', [c1]);
    assert.deepStrictEqual([c1db.cobrado, c1db.pc], [true, 1000]);
    await assert.rejects(A.cubrirConPaquete(c1), e => e.status === 409);
    const cSes = await cita(f, f.t2, pSes, 30);
    await assert.rejects(A.cubrirConPaquete(cSes), e => e.status === 400);

    // sesión 2 de 4 con 1500 < 2000 abonado → aviso; tras abonar 500 → sin aviso
    const c2 = await cita(f, f.t1, pPaq, 10);
    paq = await A.paqueteDeCita(c2);
    assert.deepStrictEqual([paq.sesion_n, paq.aviso_50], [2, true]);
    await A.registrarAbono({ presupuesto_item_id: itPaq, monto: 500, forma_pago: 'tarjeta' }, null);
    assert.strictEqual((await A.paqueteDeCita(c2)).aviso_50, false);
    // una cita pendiente (aún no realizada) cuenta como la siguiente sesión
    const c3 = await cita(f, f.t1, pPaq, -60, 'pendiente');
    assert.strictEqual((await A.paqueteDeCita(c3)).sesion_n, 3);
    assert.strictEqual(await A.paqueteDeCita(cSes), null, 'pago por sesión no es paquete');

    // Caja: por sesión cobra el precio del presupuesto (con promo); paquete trae su estado
    const caja = require('../controllers/cajaController');
    let out;
    await caja.hoy({ query: {} }, { json: d => { out = d; } }, e => { throw e; });
    const pendSes = out.pendientes.find(p => p.cita_id === cSes);
    assert.strictEqual(Number(pendSes.precio), 450);
    assert.strictEqual(pendSes.paquete, null);
    const pendPaq = out.pendientes.find(p => p.cita_id === c2);
    assert.deepStrictEqual([pendPaq.paquete.saldo, pendPaq.paquete.sesion_n], [2000, 2]);
    assert.ok(!out.pendientes.some(p => p.cita_id === c1), 'cita cubierta ya no está pendiente');
    const movAbono = out.movimientos.find(m => m.id === movimiento.id);
    assert.ok(movAbono, 'el abono debe salir en los movimientos de hoy de Caja');
    assert.ok(movAbono.paciente_nombre, 'el abono debe mostrar a la paciente');

    // A realizar muestra lo abonado
    await pool.query(`UPDATE plan_tratamientos SET estatus='cancelado' WHERE id=$1`, [pPaq]);
    await assert.rejects(A.registrarAbono({ presupuesto_item_id: itPaq, monto: 100 }, null), e => e.status === 400 && /cancelado/.test(e.message));
    const { listarPorPaciente } = require('../services/planTratamiento');
    const lp = (await listarPorPaciente(f.pa)).find(p => p.id === pPaq);
    assert.strictEqual(lp.abonado, 2000);
    console.log('✓ abonos');
  } finally {
    await limpiar(f);
  }
}

run()
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.stack); await pool.end(); process.exit(1); });
