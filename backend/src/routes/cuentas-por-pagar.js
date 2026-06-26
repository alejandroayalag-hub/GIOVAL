const { Router } = require('express');
const ctrl = require('../controllers/cuentasPorPagarController');

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const router = Router();
router.get('/resumen', soloAdmin, ctrl.resumen);
router.get('/',        soloAdmin, ctrl.list);
router.post('/',       soloAdmin, ctrl.create);
router.put('/:id',     soloAdmin, ctrl.update);
router.delete('/:id',  soloAdmin, ctrl.remove);

module.exports = router;
