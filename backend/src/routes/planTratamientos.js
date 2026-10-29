const router = require('express').Router();
router.param('pacienteId', require('../middleware/misPacientes').verificarParam);
const { requireRol } = require('../middleware/roles');
const { listarPorPaciente, historial } = require('../services/planTratamiento');

const lectura = requireRol('admin', 'asistente_medico', 'cosmetista', 'asistente_general');

router.get('/paciente/:pacienteId', lectura, async (req, res, next) => {
  try { res.json(await listarPorPaciente(req.params.pacienteId)); } catch (e) { next(e); }
});
router.get('/paciente/:pacienteId/historial', lectura, async (req, res, next) => {
  try { res.json(await historial(req.params.pacienteId)); } catch (e) { next(e); }
});

module.exports = router;
