// backend/src/routes/usuarios.js
const router = require('express').Router();
const ctrl = require('../controllers/usuariosController');
const { requireRol } = require('../middleware/roles');

router.get('/',    requireRol('admin'), ctrl.list);
router.post('/',   requireRol('admin'), ctrl.create);
router.put('/:id', requireRol('admin'), ctrl.update);

module.exports = router;
