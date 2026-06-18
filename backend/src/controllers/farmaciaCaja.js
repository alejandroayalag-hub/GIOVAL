const FarmaciaCaja = require('../models/farmaciaCaja');

exports.obtenerAbierta = async (req, res) => {
  try {
    const caja = await FarmaciaCaja.findAbiertaEmpleado(req.user.id);
    if (!caja) {
      return res.status(404).json({ error: 'No hay caja abierta', abierta: false });
    }
    res.json({ ...caja, abierta: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.abrir = async (req, res) => {
  try {
    const { efectivo_inicial } = req.body;
    if (!efectivo_inicial && efectivo_inicial !== 0) {
      return res.status(400).json({ error: 'Efectivo inicial requerido' });
    }

    const caja = await FarmaciaCaja.abrir(req.user.id, efectivo_inicial);
    res.status(201).json(caja);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.cerrar = async (req, res) => {
  try {
    const { caja_id } = req.params;
    const { efectivo_final } = req.body;

    if (!efectivo_final && efectivo_final !== 0) {
      return res.status(400).json({ error: 'Efectivo final requerido' });
    }

    const caja = await FarmaciaCaja.cerrar(caja_id, efectivo_final);
    res.json({ caja });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.historial = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const historial = await FarmaciaCaja.getHistorial(req.user.id, limit);
    res.json(historial);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
