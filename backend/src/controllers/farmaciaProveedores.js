const FarmaciaProveedor = require('../models/farmaciaProveedor');

exports.listar = async (req, res) => {
  try {
    const proveedores = await FarmaciaProveedor.findAll();
    res.json(proveedores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const proveedor = await FarmaciaProveedor.findById(req.params.id);
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, email, telefono, contacto } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

    const proveedor = await FarmaciaProveedor.create({ nombre, email, telefono, contacto });
    res.status(201).json(proveedor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const proveedor = await FarmaciaProveedor.update(req.params.id, req.body);
    res.json(proveedor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.desactivar = async (req, res) => {
  try {
    await FarmaciaProveedor.desactivar(req.params.id);
    res.json({ mensaje: 'Proveedor desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
