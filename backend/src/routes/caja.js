const router = require('express').Router();
const ctrl = require('../controllers/cajaController');
router.get('/hoy', ctrl.hoy);
module.exports = router;
