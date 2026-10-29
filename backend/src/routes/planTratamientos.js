const router = require('express').Router();
router.param('pacienteId', require('../middleware/misPacientes').verificarParam);
const { requireRol } = require('../middleware/roles');
const { listarPorPaciente, historial } = require('../services/planTratamiento');
const { crearPlanDesdeCita } = require('../services/presupuestos');

const lectura = requireRol('admin', 'asistente_medico', 'cosmetista', 'asistente_general');

router.get('/paciente/:pacienteId', lectura, async (req, res, next) => {
  try { res.json(await listarPorPaciente(req.params.pacienteId)); } catch (e) { next(e); }
});
router.get('/paciente/:pacienteId/historial', lectura, async (req, res, next) => {
  try { res.json(await historial(req.params.pacienteId)); } catch (e) { next(e); }
});

router.post('/desde-cita/:citaId', requireRol('admin', 'asistente_general', 'asistente_medico'), async (req, res, next) => {
  try { res.status(201).json(await crearPlanDesdeCita(req.params.citaId, req.user.id)); } catch (e) { next(e); }
});

module.exports = router;
