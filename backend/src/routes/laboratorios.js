const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireRol } = require('../middleware/roles');
const ctrl = require('../controllers/laboratoriosController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'laboratorios');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo PDF e imágenes (JPG, PNG)'));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.get('/',       requireRol('admin', 'asistente_medico'), ctrl.getByPaciente);
router.post('/',      requireRol('admin', 'asistente_medico'), upload.single('archivo'), ctrl.create);
router.delete('/:id', requireRol('admin'), ctrl.remove);

module.exports = router;
