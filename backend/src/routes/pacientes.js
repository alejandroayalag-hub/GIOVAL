const router = require('express').Router();
const ctrl = require('../controllers/pacientesController');
const upload = require('../middleware/upload');

router.get('/buscar', ctrl.buscar);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.post('/:id/foto', upload.single('foto'), ctrl.uploadFoto);
router.delete('/:id', (req, res, next) => {
  if (req.user?.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar pacientes' });
  next();
}, ctrl.remove);

module.exports = router;
