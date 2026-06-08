// backend/src/routes/historias-clinicas.js
const router = require('express').Router();
const ctrl = require('../controllers/historiasClinicasController');
const { requireRol } = require('../middleware/roles');

router.get('/:pacienteId', ctrl.get);
router.put('/:pacienteId', requireRol('admin', 'asistente_medico'), ctrl.save);

module.exports = router;
