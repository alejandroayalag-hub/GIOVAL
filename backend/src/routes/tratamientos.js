const router = require('express').Router();
const ctrl = require('../controllers/tratamientosController');

router.get('/', ctrl.list);
router.get('/activos', ctrl.listActivos);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
