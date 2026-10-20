const FarmaciaCaja = require('../models/farmaciaCaja');

const monto = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

// Caja abierta del usuario con sus totales; null si no tiene
exports.obtenerAbierta = async (req, res) => {
  try {
    const caja = await FarmaciaCaja.findAbiertaEmpleado(req.user.id);
    if (!caja) return res.json(null);
    res.json({ ...caja, ...(await FarmaciaCaja.totales(caja.id)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.abrir = async (req, res) => {
  try {
    const efectivo_inicial = monto(req.body.efectivo_inicial);
    if (!(efectivo_inicial >= 0)) return res.status(400).json({ error: 'Efectivo inicial requerido' });
    res.status(201).json(await FarmaciaCaja.abrir(req.user.id, efectivo_inicial));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.cerrar = async (req, res) => {
  try {
    const efectivo_final = monto(req.body.efectivo_final);
    if (!(efectivo_final >= 0)) return res.status(400).json({ error: 'Efectivo contado requerido' });

    const caja = await FarmaciaCaja.findById(req.params.caja_id);
    if (!caja) return res.status(404).json({ error: 'Caja no encontrada' });
    if (req.user.rol !== 'admin' && caja.empleado_id !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    res.json(await FarmaciaCaja.cerrar(caja.id, efectivo_final));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Encargada: su historial. Admin: todas las cajas.
exports.historial = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, limit } = req.query;
    const empleado_id = req.user.rol === 'admin' ? req.query.empleado_id : req.user.id;
    res.json(await FarmaciaCaja.getHistorial({ empleado_id, fecha_desde, fecha_hasta, limit: parseInt(limit) || 50 }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
