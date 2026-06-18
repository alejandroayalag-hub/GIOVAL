const FarmaciaVenta = require('../models/farmaciaVenta');
const FarmaciaProducto = require('../models/farmaciaProducto');

exports.listar = async (req, res) => {
  try {
    const filtros = {
      empleado_id: req.query.empleado_id || req.user.id,
      estado: req.query.estado,
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta
    };
    const ventas = await FarmaciaVenta.findAll(filtros);
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const venta = await FarmaciaVenta.findById(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    const items = await FarmaciaVenta.getItems(venta.id);
    res.json({ ...venta, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const { cliente_id, paciente_id, observaciones } = req.body;
    const venta = await FarmaciaVenta.create({
      empleado_id: req.user.id,
      cliente_id: cliente_id || null,
      paciente_id: paciente_id || null,
      observaciones
    });
    res.status(201).json(venta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.agregarItem = async (req, res) => {
  try {
    const { producto_id, cantidad } = req.body;
    const venta_id = req.params.id;

    if (!producto_id || !cantidad) {
      return res.status(400).json({ error: 'Producto y cantidad requeridos' });
    }

    const producto = await FarmaciaProducto.findById(producto_id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    if (producto.stock < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    await FarmaciaVenta.agregarItem(venta_id, producto_id, cantidad, producto.precio_venta);
    const venta = await FarmaciaVenta.findById(venta_id);
    res.json(venta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.removerItem = async (req, res) => {
  try {
    const { venta_id, item_id } = req.params;
    await FarmaciaVenta.removerItem(venta_id, item_id);
    const venta = await FarmaciaVenta.findById(venta_id);
    res.json(venta);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.pagar = async (req, res) => {
  try {
    const { venta_id } = req.params;
    const { metodo_pago } = req.body;

    if (!metodo_pago) {
      return res.status(400).json({ error: 'Método de pago requerido' });
    }

    const venta = await FarmaciaVenta.findById(venta_id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const items = await FarmaciaVenta.getItems(venta_id);
    for (const item of items) {
      const producto = await FarmaciaProducto.findById(item.producto_id);
      if (producto.stock < item.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
      }
      await FarmaciaProducto.decrementarStock(item.producto_id, item.cantidad);
    }

    await FarmaciaVenta.pagar(venta_id, metodo_pago);
    const ventaPagada = await FarmaciaVenta.findById(venta_id);
    res.json({ mensaje: 'Venta pagada', venta: ventaPagada });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.cancelar = async (req, res) => {
  try {
    const { venta_id } = req.params;
    await FarmaciaVenta.cancelar(venta_id);
    const venta = await FarmaciaVenta.findById(venta_id);
    res.json({ mensaje: 'Venta cancelada', venta });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
