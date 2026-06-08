// backend/src/routes/citas.js
const router = require('express').Router();
const ctrl = require('../controllers/citasController');
const { requireRol } = require('../middleware/roles');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', requireRol('admin'), ctrl.remove);

module.exports = router;
