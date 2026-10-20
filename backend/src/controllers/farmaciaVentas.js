const FarmaciaVenta = require('../models/farmaciaVenta');
const FarmaciaCaja = require('../models/farmaciaCaja');

const esAdmin = (req) => req.user.rol === 'admin';

// Encargada: solo ventas de su caja abierta. Admin: filtros libres.
exports.listar = async (req, res) => {
  try {
    if (!esAdmin(req)) {
      const caja = await FarmaciaCaja.findAbiertaEmpleado(req.user.id);
      return res.json(caja ? await FarmaciaVenta.findAll({ caja_id: caja.id }) : []);
    }
    const { empleado_id, caja_id, estado, fecha_desde, fecha_hasta } = req.query;
    res.json(await FarmaciaVenta.findAll({ empleado_id, caja_id, estado, fecha_desde, fecha_hasta }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const venta = await FarmaciaVenta.findById(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (!esAdmin(req) && venta.empleado_id !== req.user.id) return res.status(403).json({ error: 'Sin permisos' });
    const items = await FarmaciaVenta.getItems(venta.id);
    res.json({ ...venta, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkout = async (req, res) => {
  try {
    const caja = await FarmaciaCaja.findAbiertaEmpleado(req.user.id);
    if (!caja) return res.status(400).json({ error: 'Abre tu caja antes de vender' });
    const { items, metodo_pago } = req.body;
    const venta = await FarmaciaVenta.checkout({ empleado_id: req.user.id, caja_id: caja.id, items, metodo_pago });
    res.status(201).json(venta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Encargada: solo ventas de su caja abierta. Admin: cualquiera.
exports.cancelar = async (req, res) => {
  try {
    const venta = await FarmaciaVenta.findById(req.params.venta_id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (!esAdmin(req)) {
      const caja = await FarmaciaCaja.findAbiertaEmpleado(req.user.id);
      if (!caja || venta.caja_id !== caja.id) {
        return res.status(403).json({ error: 'Solo puedes cancelar ventas de tu caja abierta' });
      }
    }
    res.json(await FarmaciaVenta.cancelar(venta.id, req.user.id));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
