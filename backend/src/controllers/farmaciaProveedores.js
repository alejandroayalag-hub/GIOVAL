const fs = require('fs');
const path = require('path');
const FarmaciaProveedor = require('../models/farmaciaProveedor');

// ponytail: PDFs del proveedor en disco, fuera del deploy y de /uploads (público): /home/apps/elys/catalogos/<id>-<tipo>.pdf.
// Sin tabla ni subida desde la app; agregar upload si Gioval necesita cambiarlos sola.
const PDF_DIR = path.join(__dirname, '..', '..', '..', 'catalogos');
const PDF_TIPOS = ['precios', 'vademecum'];
const pdfPath = (id, tipo) => path.join(PDF_DIR, `${parseInt(id, 10)}-${tipo}.pdf`);
const pdfsDe = (id) => PDF_TIPOS.filter(t => fs.existsSync(pdfPath(id, t)));

exports.listar = async (req, res) => {
  try {
    const proveedores = await FarmaciaProveedor.findAll();
    res.json(proveedores.map(p => ({ ...p, pdfs: pdfsDe(p.id) })));
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

exports.pdf = (req, res) => {
  const { id, tipo } = req.params;
  if (!PDF_TIPOS.includes(tipo) || !fs.existsSync(pdfPath(id, tipo)))
    return res.status(404).json({ error: 'PDF no disponible' });
  res.sendFile(pdfPath(id, tipo));
};
