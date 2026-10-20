// Cosmetóloga (cosmetista) y enfermera (asistente_medico) ligadas a su ficha de Personal
// solo ven a los pacientes que atienden (tienen o tuvieron cita con ellas).
// Admin, recepción y usuarios aún sin ligar ven todo.
const pool = require('../db/pool');

const ROLES_ACOTADOS = ['cosmetista', 'asistente_medico'];

// empleado_id del usuario si está acotado, si no null. Se consulta en BD (no en el JWT)
// para que ligar/desligar en Personal aplique sin volver a iniciar sesión.
async function empleadoAcotado(req) {
  if (!ROLES_ACOTADOS.includes(req.user?.rol)) return null;
  if (req.empleadoAcotado === undefined) {
    const { rows } = await pool.query('SELECT empleado_id FROM usuarios WHERE id = $1', [req.user.id]);
    req.empleadoAcotado = rows[0]?.empleado_id || null;
  }
  return req.empleadoAcotado;
}

async function verificar(req, res, next, pacienteId) {
  try {
    const empleadoId = await empleadoAcotado(req);
    if (!empleadoId || pacienteId === undefined || pacienteId === null || pacienteId === '') return next();
    const { rows } = await pool.query(
      'SELECT 1 FROM citas WHERE paciente_id = $1 AND empleada_id = $2 LIMIT 1',
      [Number(pacienteId) || 0, empleadoId]);
    if (!rows.length) return res.status(403).json({ error: 'Este paciente no está asignado a ti' });
    next();
  } catch (err) { next(err); }
}

// router.param('pacienteId', verificarParam) → rutas /paciente/:pacienteId
const verificarParam = (req, res, next, pacienteId) => verificar(req, res, next, pacienteId);

// A nivel de montaje: ?paciente_id= o body.paciente_id
// ponytail: rutas por id de cita/nota/archivo no se revisan; los listados ya están acotados
const verificarQueryBody = (req, res, next) =>
  verificar(req, res, next, req.query.paciente_id ?? req.body?.paciente_id);

module.exports = { empleadoAcotado, verificarParam, verificarQueryBody };
