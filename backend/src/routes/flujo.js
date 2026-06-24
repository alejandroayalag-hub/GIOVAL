const router = require('express').Router();
const ctrl = require('../controllers/flujoController');

router.get('/hoy', ctrl.hoy);
router.post('/:cita_id/checkin', ctrl.checkin);
router.patch('/:cita_id/avanzar', ctrl.avanzar);

module.exports = router;
