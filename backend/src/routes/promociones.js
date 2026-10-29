const router = require('express').Router();
const { requireRol } = require('../middleware/roles');
const P = require('../services/promociones');

const lectura = requireRol('admin', 'asistente_general', 'asistente_medico');
const admin = requireRol('admin');
const h = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };

router.get('/', lectura, h(async (req, res) => res.json(await P.listar())));
router.get('/vigentes', lectura, h(async (req, res) => {
  const ids = String(req.query.tratamientos || '').split(',').map(Number).filter(Boolean);
  const fecha = req.query.fecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  res.json(ids.length ? await P.promosVigentes(ids, fecha) : []);
}));
router.post('/', admin, h(async (req, res) => res.status(201).json(await P.crear(req.body, req.user.id))));
router.put('/:id', admin, h(async (req, res) => res.json(await P.actualizar(req.params.id, req.body))));
router.delete('/:id', admin, h(async (req, res) => { await P.desactivar(req.params.id); res.json({ ok: true }); }));

module.exports = router;
