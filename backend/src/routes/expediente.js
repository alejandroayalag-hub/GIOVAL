// backend/src/routes/expediente.js
// Diagnósticos CIE-10, recetas, notas médicas libres y archivos del paciente
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireRol } = require('../middleware/roles');
const ctrl = require('../controllers/expedienteController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'expediente');
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
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo PDF e imágenes (JPG, PNG, HEIC, WEBP)'));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const medico = requireRol('admin', 'asistente_medico');

// CIE-10
router.get('/cie10', medico, ctrl.searchCie10);

// Diagnósticos
router.get('/diagnosticos/paciente/:pacienteId', medico, ctrl.diagnosticosByPaciente);
router.post('/diagnosticos', medico, ctrl.createDiagnostico);
router.put('/diagnosticos/:id', medico, ctrl.updateDiagnostico);
router.delete('/diagnosticos/:id', requireRol('admin'), ctrl.removeDiagnostico);

// Recetas
router.get('/recetas/paciente/:pacienteId', medico, ctrl.recetasByPaciente);
router.post('/recetas', medico, ctrl.createReceta);
router.put('/recetas/:id', medico, ctrl.updateReceta);
router.delete('/recetas/:id', requireRol('admin'), ctrl.removeReceta);

// Notas médicas libres
router.get('/notas-medicas/paciente/:pacienteId', medico, ctrl.notasByPaciente);
router.post('/notas-medicas', medico, ctrl.createNota);
router.put('/notas-medicas/:id', medico, ctrl.updateNota);
router.delete('/notas-medicas/:id', requireRol('admin'), ctrl.removeNota);

// Archivos (recepción puede ver y subir pólizas/administrativos; el controlador limita categorías)
const archivos = requireRol('admin', 'asistente_medico', 'asistente_general');
router.get('/archivos/paciente/:pacienteId', archivos, ctrl.archivosByPaciente);
router.post('/archivos', archivos, upload.single('archivo'), ctrl.createArchivo);
router.delete('/archivos/:id', requireRol('admin'), ctrl.removeArchivo);

module.exports = router;
