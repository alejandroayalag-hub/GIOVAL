const { Router } = require('express');
const ctrl = require('../controllers/insumosController');

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const insumosRouter = Router();
insumosRouter.get('/categorias', ctrl.categoriasInsumos);
insumosRouter.get('/',     ctrl.listInsumos);
insumosRouter.put('/:id',  soloAdmin, ctrl.updateInsumo);

const kitsRouter = Router();
kitsRouter.get('/',                ctrl.listKits);
kitsRouter.get('/:id',             ctrl.getKit);
kitsRouter.get('/:id/costo',       ctrl.costoKit);
kitsRouter.put('/:id/items/:itemId', soloAdmin, ctrl.updateKitItem);

const tratamientoKitRouter = Router();
tratamientoKitRouter.get('/:id/costo-cabina', ctrl.costoCabinaByTratamiento);

module.exports = { insumosRouter, kitsRouter, tratamientoKitRouter };
