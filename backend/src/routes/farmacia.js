const express = require('express');
const router = express.Router();
const { authFarmacia, authFarmaciaAdmin } = require('../middleware/authFarmacia');

const farmaciaProductos = require('../controllers/farmaciaProductos');
const farmaciaProveedores = require('../controllers/farmaciaProveedores');
const farmaciaVentas = require('../controllers/farmaciaVentas');
const farmaciaCaja = require('../controllers/farmaciaCaja');
const farmaciaReportes = require('../controllers/farmaciaReportes');

// Productos - acceso FARMACISTA/admin
router.get('/productos', authFarmacia, farmaciaProductos.listar);
router.get('/productos/:id', authFarmacia, farmaciaProductos.obtener);
router.post('/productos', authFarmacia, farmaciaProductos.crear);
router.put('/productos/:id', authFarmacia, farmaciaProductos.actualizar);
router.delete('/productos/:id', authFarmaciaAdmin, farmaciaProductos.desactivar);

// Proveedores - solo admin
router.get('/proveedores', authFarmaciaAdmin, farmaciaProveedores.listar);
router.get('/proveedores/:id', authFarmaciaAdmin, farmaciaProveedores.obtener);
router.post('/proveedores', authFarmaciaAdmin, farmaciaProveedores.crear);
router.put('/proveedores/:id', authFarmaciaAdmin, farmaciaProveedores.actualizar);
router.delete('/proveedores/:id', authFarmaciaAdmin, farmaciaProveedores.desactivar);

// Ventas - FARMACISTA/admin
router.get('/ventas', authFarmacia, farmaciaVentas.listar);
router.get('/ventas/:id', authFarmacia, farmaciaVentas.obtener);
router.post('/ventas', authFarmacia, farmaciaVentas.crear);
router.post('/ventas/:id/items', authFarmacia, farmaciaVentas.agregarItem);
router.delete('/ventas/:venta_id/items/:item_id', authFarmacia, farmaciaVentas.removerItem);
router.post('/ventas/:venta_id/pagar', authFarmacia, farmaciaVentas.pagar);
router.post('/ventas/:venta_id/cancelar', authFarmacia, farmaciaVentas.cancelar);

// Caja - FARMACISTA
router.get('/caja/turno-actual', authFarmacia, farmaciaCaja.obtenerAbierta);
router.post('/caja/abrir', authFarmacia, farmaciaCaja.abrir);
router.put('/caja/:caja_id/cerrar', authFarmacia, farmaciaCaja.cerrar);
router.get('/caja/historial', authFarmacia, farmaciaCaja.historial);

// Reportes - solo admin
router.get('/reportes/resumen', authFarmaciaAdmin, farmaciaReportes.resumen);
router.get('/reportes/stock-bajo', authFarmaciaAdmin, farmaciaReportes.stockBajo);
router.get('/reportes/top-productos', authFarmaciaAdmin, farmaciaReportes.topProductos);
router.get('/reportes/ganancias', authFarmaciaAdmin, farmaciaReportes.ganancias);
router.get('/reportes/por-empleado', authFarmaciaAdmin, farmaciaReportes.ventasPorEmpleado);

module.exports = router;
