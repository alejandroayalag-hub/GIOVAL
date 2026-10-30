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

// Hallazgos de la revisión final
async function testRevision() {
  const A = require('../services/abonos');
  const { crearPresupuesto } = require('../services/presupuestos');
  const caja = require('../controllers/cajaController');
  const fin = require('../controllers/finanzas');
  const f = await fixtures();
  const res = () => { const r = { code: 200 }; r.status = c => { r.code = c; return r; }; r.json = d => { r.body = d; return r; }; return r; };
  try {
    const mk = async (t, n) => (await pool.query(
      `INSERT INTO plan_tratamientos (paciente_id, tratamiento_id, sesiones_estimadas) VALUES ($1,$2,$3) RETURNING id`,
      [f.pa, t, n])).rows[0].id;
    const pPaq = await mk(f.t1, 2);
    const pres = await crearPresupuesto({ paciente_id: f.pa, firma: FIRMA, items: [{ plan_id: pPaq, modalidad: 'completo' }] }, null);
    const item = pres.items[0].id;

    // 1. el anticipo pagado en una cita del paquete cuenta como abonado
    const cA = await cita(f, f.t1, pPaq, 3);
    await pool.query(`INSERT INTO movimientos (tipo, concepto, monto, fecha, cita_id) VALUES ('ingreso','Anticipo TEST',300,CURRENT_DATE,$1)`, [cA]);
    assert.strictEqual((await A.paqueteDeCita(cA)).abonado, 300, 'anticipo no cuenta para el paquete');

    // 2. cita realizada sin liga al plan: Caja la liga sola al único plan aceptado y la trata como paquete
    const cSin = await cita(f, f.t1, null, 2);
    let out = res();
    await caja.hoy({ query: {} }, out, e => { throw e; });
    const pend = out.body.pendientes.find(p => p.cita_id === cSin);
    assert.ok(pend && pend.paquete, 'cita sin liga debe salir como paquete');
    assert.strictEqual((await pool.query('SELECT plan_tratamiento_id FROM citas WHERE id=$1', [cSin])).rows[0].plan_tratamiento_id, pPaq);

    // 5. sesión de más sobre el paquete o cita no realizada: no se cubre gratis
    const cExtra = await cita(f, f.t1, pPaq, 1); // tercera sesión de un paquete de 2
    assert.strictEqual(await A.paqueteDeCita(cExtra), null, 'sesión extra no es del paquete');
    const cFut = await cita(f, f.t1, pPaq, -60, 'pendiente');
    await assert.rejects(A.cubrirConPaquete(cFut), e => e.status === 400);
    await pool.query(`UPDATE plan_tratamientos SET estatus='cancelado' WHERE id=$1`, [pPaq]);
    assert.strictEqual(await A.paqueteDeCita(cA), null, 'plan cancelado no cubre sesiones');
    await assert.rejects(A.cubrirConPaquete(cA), e => e.status === 400);
    await pool.query(`UPDATE plan_tratamientos SET estatus='completado' WHERE id=$1`, [pPaq]);
    assert.ok(await A.paqueteDeCita(cA), 'plan completado sigue mostrando su paquete');

    // 3/4. A realizar y cerrados traen el item para abonar
    const { listarPorPaciente } = require('../services/planTratamiento');
    assert.strictEqual((await listarPorPaciente(f.pa)).find(p => p.id === pPaq).presupuesto_item_id, item);

    // 6. editar un abono en Finanzas: no puede rebasar el saldo y solo roles de cobro
    const { movimiento } = await A.registrarAbono({ presupuesto_item_id: item, monto: 500 }, null);
    out = res();
    await fin.updateMovimiento({ params: { id: movimiento.id }, body: { monto: 5000 }, user: { rol: 'admin' } }, out, e => { out.code = e.status; });
    assert.strictEqual(out.code, 400, 'editar abono por encima del saldo debe fallar');
    out = res();
    await fin.updateMovimiento({ params: { id: movimiento.id }, body: { monto: 400 }, user: { rol: 'cosmetista' } }, out, e => { out.code = e.status; });
    assert.strictEqual(out.code, 403);
    out = res();
    await fin.updateMovimiento({ params: { id: movimiento.id }, body: { monto: 600 }, user: { rol: 'asistente_general' } }, out, e => { throw e; });
    assert.strictEqual(Number(out.body.monto), 600);
    console.log('✓ revisión final');
  } finally {
    await limpiar(f);
  }
}

run().then(testRevision)
  .then(() => { console.log('OK'); return pool.end(); })
  .catch(async e => { console.error('✗', e.stack); await pool.end(); process.exit(1); });
