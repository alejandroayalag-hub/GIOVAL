const fs = require('fs');
const EmpleadoModel = require('../models/empleado');
const pool = require('../db/pool');

// Puesto libre ("Cosmetóloga", "Enfermero", "Médica"...) → puesto de tratamientos.puesto
function puestoTratamientos(puesto) {
  const p = (puesto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/cosmetolog/.test(p)) return 'cosmetologa';
  if (/enfermer/.test(p)) return 'enfermera';
  if (/medic|doctor/.test(p)) return 'medico';
  return null;
}

// Si aún no tiene tratamientos asignados, le asigna los de su puesto (agenda en línea)
async function asignarTratamientosPorPuesto(empleado) {
  const puesto = puestoTratamientos(empleado.puesto);
  if (!puesto) return;
  await pool.query(
    `INSERT INTO empleado_tratamiento (empleado_id, tratamiento_id)
     SELECT $1, t.id FROM tratamientos t
     WHERE t.puesto = $2 AND t.activo
       AND NOT EXISTS (SELECT 1 FROM empleado_tratamiento WHERE empleado_id = $1)`,
    [empleado.id, puesto]);
}

exports.getAll = async (req, res, next) => {
  try {
    const empleados = await EmpleadoModel.findAll();
    res.json(empleados);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const empleado = await EmpleadoModel.findById(req.params.id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { curp, rfc, fecha_ingreso, email } = req.body;
    if (!curp || !rfc || !fecha_ingreso || !email)
      return res.status(400).json({ error: 'CURP, RFC, Fecha de ingreso y Email son obligatorios' });
    const empleado = await EmpleadoModel.create(req.body);
    await asignarTratamientosPorPuesto(empleado);
    res.status(201).json(empleado);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const empleado = await EmpleadoModel.update(req.params.id, req.body);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    await asignarTratamientosPorPuesto(empleado);
    res.json(empleado);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await EmpleadoModel.delete(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

exports.uploadFoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
    const empleado = await EmpleadoModel.findById(req.params.id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    if (empleado.foto && fs.existsSync(empleado.foto)) fs.unlinkSync(empleado.foto);
    const updated = await EmpleadoModel.update(req.params.id, { foto: req.file.path });
    res.json(updated);
  } catch (err) { next(err); }
};
