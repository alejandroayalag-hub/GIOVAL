const FarmaciaProducto = require('../models/farmaciaProducto');

exports.listar = async (req, res) => {
  try {
    const filtros = {
      nombre: req.query.nombre,
      proveedor_id: req.query.proveedor_id,
      stock_bajo: req.query.stock_bajo === 'true'
    };
    const productos = await FarmaciaProducto.findAll(filtros);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const producto = await FarmaciaProducto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, codigo_proveedor, categoria, precio_costo, precio_venta, stock, stock_minimo, proveedor_id } = req.body;

    if (!nombre || !precio_costo || !precio_venta) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const producto = await FarmaciaProducto.create({
      nombre, codigo_proveedor, categoria, precio_costo, precio_venta, stock, stock_minimo, proveedor_id
    });
    res.status(201).json(producto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const producto = await FarmaciaProducto.update(req.params.id, req.body);
    res.json(producto);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.desactivar = async (req, res) => {
  try {
    await FarmaciaProducto.desactivar(req.params.id);
    res.json({ mensaje: 'Producto desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
