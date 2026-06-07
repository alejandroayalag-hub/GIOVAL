// backend/src/routes/finanzas.js
const { Router } = require('express');
const ctrl = require('../controllers/finanzas');

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const categorias = Router();
categorias.get('/',    ctrl.listCategorias);
categorias.post('/',   soloAdmin, ctrl.createCategoria);
categorias.put('/:id', soloAdmin, ctrl.updateCategoria);
categorias.delete('/:id', soloAdmin, ctrl.deleteCategoria);

const movimientos = Router();
movimientos.get('/resumen', ctrl.resumenMovimientos);
movimientos.get('/',        ctrl.listMovimientos);
movimientos.post('/',       ctrl.createMovimiento);
movimientos.put('/:id',     ctrl.updateMovimiento);
movimientos.delete('/:id',  ctrl.deleteMovimiento);

const cortes = Router();
cortes.get('/hoy',     ctrl.corteHoy);
cortes.get('/',        ctrl.listCortes);
cortes.post('/cerrar', soloAdmin, ctrl.cerrarCorte);
cortes.get('/:id',     ctrl.getCorte);

module.exports = { categorias, movimientos, cortes };
