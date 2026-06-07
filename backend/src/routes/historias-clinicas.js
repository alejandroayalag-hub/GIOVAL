const router = require('express').Router();
const ctrl = require('../controllers/historiasClinicasController');

router.get('/:pacienteId', ctrl.get);
router.put('/:pacienteId', ctrl.save);

module.exports = router;
