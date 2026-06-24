const router = require('express').Router();
const ctrl = require('../controllers/documentosClinicosController');

router.get('/paciente/:pacienteId',           ctrl.getByPaciente);
router.get('/paciente/:pacienteId/:tipo',     ctrl.getByTipo);
router.post('/',                              ctrl.create);
router.put('/:id',                            ctrl.update);
router.delete('/:id',                         ctrl.remove);

module.exports = router;
