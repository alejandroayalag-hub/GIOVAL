const router = require('express').Router();
const { requireRol } = require('../middleware/roles');
const ctrl = require('../controllers/documentosClinicosController');

router.get('/paciente/:pacienteId',       requireRol('admin', 'asistente_medico'), ctrl.getByPaciente);
router.get('/paciente/:pacienteId/:tipo', requireRol('admin', 'asistente_medico'), ctrl.getByTipo);
router.post('/',                          requireRol('admin', 'asistente_medico'), ctrl.create);
router.put('/:id',                        requireRol('admin', 'asistente_medico'), ctrl.update);
router.delete('/:id',                     requireRol('admin'), ctrl.remove);

module.exports = router;
