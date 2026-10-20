// backend/src/routes/historias-clinicas.js
const router = require('express').Router();
router.param('pacienteId', require('../middleware/misPacientes').verificarParam);
const ctrl = require('../controllers/historiasClinicasController');
const { requireRol } = require('../middleware/roles');

router.get('/:pacienteId', requireRol('admin', 'asistente_medico'), ctrl.get);
router.put('/:pacienteId', requireRol('admin', 'asistente_medico'), ctrl.save);

module.exports = router;
