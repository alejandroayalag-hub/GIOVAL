// Verificación de Finanzas por empresa contra la BD local: node scripts/check-finanzas-empresa.js
// Crea filas de prueba (concepto '__check_empresa__') y las borra al final.
require('dotenv').config({ quiet: true });
const assert = require('assert');
const pool = require('../src/db/pool');
const { Movimiento, CorteCaja, Reportes } = require('../src/models/finanzas');
const { CuentaPorPagar } = require('../src/models/cuentasPorPagar');
const { Nomina } = require('../src/models/nomina');
const { filtroEmpresa, empresaEscritura } = require('../src/utils/empresa');

const TAG = '__check_empresa__';
const fecha = '2099-01-15', mes = '2099-01';

(async () => {
  try {
    assert.strictEqual(filtroEmpresa({ empresa: 'elys' }), 'elys');
    assert.strictEqual(filtroEmpresa({ empresa: 'todas' }), null);
    assert.strictEqual(empresaEscritura(undefined), 'giovanna');
    assert.throws(() => empresaEscritura('otra'), /Empresa inválida/);

    await Movimiento.create({ tipo: 'ingreso', concepto: TAG, monto: 100, fecha, empresa: 'giovanna' });
    await Movimiento.create({ tipo: 'ingreso', concepto: TAG, monto: 250, fecha, empresa: 'elys' });
    await Movimiento.create({ tipo: 'egreso',  concepto: TAG, monto: 40,  fecha, empresa: 'elys' });

    const suma = rows => rows.filter(r => r.concepto === TAG).length;
    assert.strictEqual(suma(await Movimiento.list({ fecha_inicio: fecha, fecha_fin: fecha, empresa: 'elys' })), 2);
    assert.strictEqual(suma(await Movimiento.list({ fecha_inicio: fecha, fecha_fin: fecha })), 3);

    const er = await Reportes.estadoResultados(mes, 'elys');
    assert.strictEqual(er.ingresos_brutos, 250);
    assert.strictEqual(er.total_egresos, 40);
    assert.strictEqual((await Reportes.estadoResultados(mes)).ingresos_brutos, 350);
    const porMes = await Movimiento.resumenPorMes({ fecha_inicio: fecha, fecha_fin: fecha, empresa: 'giovanna' });
    assert.strictEqual(parseFloat(porMes[0].ingresos), 100);

    // Cortes: uno por empresa y día
    await pool.query(`INSERT INTO cortes_caja (fecha, total_ingresos, total_egresos, saldo, empresa) VALUES ($1,0,0,0,'elys')`, [fecha]);
    assert.strictEqual(await CorteCaja.estaCerrado(fecha, 'elys'), true);
    assert.strictEqual(await CorteCaja.estaCerrado(fecha, 'giovanna'), false);
    assert.strictEqual(await CorteCaja.estaCerrado(fecha), false);
    await pool.query(`INSERT INTO cortes_caja (fecha, total_ingresos, total_egresos, saldo, empresa) VALUES ($1,0,0,0,'giovanna')`, [fecha]);
    assert.strictEqual(await CorteCaja.estaCerrado(fecha), true);
    await assert.rejects(pool.query(`INSERT INTO cortes_caja (fecha, total_ingresos, total_egresos, saldo, empresa) VALUES ($1,0,0,0,'elys')`, [fecha]));

    const cxp = await CuentaPorPagar.create({ concepto: TAG, importe_total: 500, empresa: 'elys' });
    assert.ok((await CuentaPorPagar.list({ empresa: 'elys' })).some(r => r.id === cxp.id));
    assert.ok(!(await CuentaPorPagar.list({ empresa: 'giovanna' })).some(r => r.id === cxp.id));
    await CuentaPorPagar.delete(cxp.id);

    const n = await Nomina.create({ mes, nombre_rol: TAG, sueldo_base: 1000, empresa: 'elys' });
    assert.strictEqual((await Nomina.resumenMes(mes, 'elys')).empleados, 1);
    assert.strictEqual((await Nomina.resumenMes(mes, 'giovanna')).empleados, 0);
    await Nomina.delete(n.id);

    console.log('✓ finanzas por empresa OK');
  } finally {
    await pool.query('DELETE FROM movimientos WHERE concepto = $1', [TAG]);
    await pool.query('DELETE FROM cortes_caja WHERE fecha = $1', [fecha]);
    await pool.end();
  }
})().catch(e => { console.error(e); process.exit(1); });
