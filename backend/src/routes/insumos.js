const { Router } = require('express');
const ctrl = require('../controllers/insumosController');

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const insumosRouter = Router();
insumosRouter.get('/categorias',      ctrl.categoriasInsumos);
insumosRouter.get('/barcode/:codigo', ctrl.getInsumoByBarcode);
insumosRouter.get('/',     ctrl.listInsumos);
insumosRouter.post('/',    soloAdmin, ctrl.createInsumo);
insumosRouter.post('/:id/entrada', soloAdmin, ctrl.entradaInsumo);
insumosRouter.put('/:id',  soloAdmin, ctrl.updateInsumo);

const kitsRouter = Router();
kitsRouter.get('/',                ctrl.listKits);
kitsRouter.get('/:id',             ctrl.getKit);
kitsRouter.get('/:id/costo',       ctrl.costoKit);
kitsRouter.post('/:id/items',        soloAdmin, ctrl.addKitItem);
kitsRouter.put('/:id/items/:itemId', soloAdmin, ctrl.updateKitItem);
kitsRouter.delete('/:id/items/:itemId', soloAdmin, ctrl.removeKitItem);

const tratamientoKitRouter = Router();
tratamientoKitRouter.get('/:id/costo-cabina', ctrl.costoCabinaByTratamiento);

module.exports = { insumosRouter, kitsRouter, tratamientoKitRouter };
