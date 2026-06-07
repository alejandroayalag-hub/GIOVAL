const router = require('express').Router();
const ctrl = require('../controllers/pacientesController');

router.get('/buscar', ctrl.buscar);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
