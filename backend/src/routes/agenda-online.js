const router = require('express').Router();
const ctrl = require('../controllers/agendaOnlineController');
const { requireRol } = require('../middleware/roles');

const recepcion = requireRol('admin', 'asistente_general');

router.get('/', recepcion, ctrl.bandeja);
router.post('/:id/confirmar', recepcion, ctrl.confirmar);
router.post('/:id/rechazar', recepcion, ctrl.rechazar);
router.post('/:id/anticipo', recepcion, ctrl.registrarAnticipo);
router.post('/:id/devuelto', recepcion, ctrl.marcarDevuelto);
router.get('/especialistas/:empleadoId', recepcion, ctrl.tratamientosDeEmpleada);
router.put('/especialistas/:empleadoId', requireRol('admin'), ctrl.guardarTratamientosDeEmpleada);

module.exports = router;
