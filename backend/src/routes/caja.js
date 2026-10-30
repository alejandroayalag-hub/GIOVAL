const router = require('express').Router();
const ctrl = require('../controllers/cajaController');
const { requireRol } = require('../middleware/roles');
const { registrarAbono, cubrirConPaquete, ROLES_COBRO } = require('../services/abonos');

const rolesCobro = requireRol(...ROLES_COBRO);
const wrap = fn => (req, res, next) => fn(req, res).catch(next);

router.get('/hoy', ctrl.hoy);
router.post('/abonos', rolesCobro, wrap(async (req, res) => res.status(201).json(await registrarAbono(req.body, req.user.id))));
router.post('/citas/:id/paquete', rolesCobro, wrap(async (req, res) => res.json(await cubrirConPaquete(req.params.id))));
module.exports = router;
