// backend/src/routes/pacientes.js
const router = require('express').Router();
const ctrl = require('../controllers/pacientesController');
const upload = require('../middleware/upload');
const { requireRol } = require('../middleware/roles');

router.get('/buscar', ctrl.buscar);
router.get('/', ctrl.list);
router.post('/', requireRol('admin'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', requireRol('admin', 'asistente_general'), ctrl.update);
router.post('/:id/foto', upload.single('foto'), ctrl.uploadFoto);
router.delete('/:id', requireRol('admin'), ctrl.remove);

module.exports = router;
