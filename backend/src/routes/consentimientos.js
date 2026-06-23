const router = require('express').Router();
const ctrl = require('../controllers/consentimientosController');

router.get('/tratamiento/:tratamientoId', ctrl.getByTratamiento);
router.put('/tratamiento/:tratamientoId', ctrl.save);
router.get('/general/:codigo', ctrl.getByCodigo);
router.put('/general/:codigo', ctrl.saveGeneral);
router.get('/firmados/paciente/:pacienteId', ctrl.getFirmadosByPaciente);
router.get('/firmados/cita/:citaId', ctrl.getFirmadoByCita);
router.post('/firmar', ctrl.firmar);

module.exports = router;
