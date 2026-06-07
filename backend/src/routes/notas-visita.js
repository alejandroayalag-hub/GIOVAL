const router = require('express').Router();
const ctrl = require('../controllers/notasVisitaController');

router.get('/paciente/:pacienteId', ctrl.getByPaciente);
router.get('/', ctrl.getByCita);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
