const router = require('express').Router();
const ctrl = require('../controllers/syncController');

router.get('/status',   ctrl.status);
router.post('/pull',    ctrl.pull);
router.post('/push-all', ctrl.pushAll);

module.exports = router;
