// backend/src/routes/citas.js
const router = require('express').Router();
const ctrl = require('../controllers/citasController');
const insumosCtrl = require('../controllers/insumosController');
const { requireRol } = require('../middleware/roles');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', requireRol('admin'), ctrl.remove);

// Consumo de insumos por cita (Fase 2 inventario)
router.get('/:id/insumos', insumosCtrl.checklistCitaInsumos);
router.post('/:id/insumos/confirmar', requireRol('admin', 'asistente_medico'), insumosCtrl.confirmarCitaInsumos);

module.exports = router;
