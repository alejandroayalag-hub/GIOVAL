const { Router } = require('express');
const { requireRol } = require('../middleware/roles');
const ctrl = require('../controllers/finanzasFarmaciaController');

// Supervisión de farmacia: solo admin
const router = Router();
router.use(requireRol('admin'));
router.get('/resumen',        ctrl.resumen);
router.get('/egresos',        ctrl.listEgresos);
router.post('/egresos',       ctrl.createEgreso);
router.delete('/egresos/:id', ctrl.deleteEgreso);

module.exports = router;
