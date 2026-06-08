// backend/src/routes/notas-visita.js
const router = require('express').Router();
const ctrl = require('../controllers/notasVisitaController');
const { requireRol } = require('../middleware/roles');

const puedeEscribir = requireRol('admin', 'asistente_medico', 'cosmetista');

router.get('/paciente/:pacienteId', ctrl.getByPaciente);
router.get('/', ctrl.getByCita);
router.post('/', puedeEscribir, ctrl.create);
router.put('/:id', puedeEscribir, ctrl.update);
router.delete('/:id', requireRol('admin'), ctrl.remove);

module.exports = router;
