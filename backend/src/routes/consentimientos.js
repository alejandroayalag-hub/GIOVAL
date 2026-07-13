const router = require('express').Router();
const { requireRol } = require('../middleware/roles');
const ctrl = require('../controllers/consentimientosController');

const clinico = requireRol('admin', 'asistente_medico', 'cosmetista');
const editarPlantilla = requireRol('admin', 'asistente_medico');

// Lectura y firma: incluye cosmetista (necesita para tratamientos)
router.get('/tratamiento/:tratamientoId',    clinico, ctrl.getByTratamiento);
router.get('/general/:codigo',               clinico, ctrl.getByCodigo);
router.get('/firmados/paciente/:pacienteId', clinico, ctrl.getFirmadosByPaciente);
router.get('/firmados/cita/:citaId',         clinico, ctrl.getFirmadoByCita);
router.post('/firmar',                       clinico, ctrl.firmar);
// Edición de plantillas de consentimiento: solo admin/asistente_medico
router.put('/tratamiento/:tratamientoId',    editarPlantilla, ctrl.save);
router.put('/general/:codigo',               editarPlantilla, ctrl.saveGeneral);

module.exports = router;
