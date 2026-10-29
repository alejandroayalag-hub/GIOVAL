const router = require('express').Router();
router.param('pacienteId', require('../middleware/misPacientes').verificarParam);
const { requireRol } = require('../middleware/roles');
const S = require('../services/presupuestos');

const roles = requireRol('admin', 'asistente_general', 'asistente_medico');
const h = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };

router.post('/', roles, h(async (req, res) => {
  const { paciente_id, items, firma } = req.body;
  res.status(201).json(await S.crearPresupuesto(
    { paciente_id, items, firma, ip: req.ip, user_agent: req.get('user-agent') }, req.user.id));
}));
router.get('/paciente/:pacienteId', roles, h(async (req, res) => res.json(await S.listarPorPaciente(req.params.pacienteId))));
router.get('/:id', roles, h(async (req, res) => {
  const p = await S.getPresupuesto(req.params.id);
  if (!p) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  res.json(p);
}));

module.exports = router;
