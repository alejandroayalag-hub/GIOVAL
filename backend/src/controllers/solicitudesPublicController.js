const pool = require('../db/pool')

async function crearSolicitud(req, res) {
  const { nombre, apellido, telefono, email, servicio, fecha_preferida, notas } = req.body

  if (!nombre?.trim() || !apellido?.trim() || !telefono?.trim()) {
    return res.status(400).json({ error: 'nombre, apellido y telefono son requeridos' })
  }

  const { rows } = await pool.query(
    `INSERT INTO solicitudes_cita (nombre, apellido, telefono, email, servicio, fecha_preferida, notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, nombre, apellido, created_at`,
    [
      nombre.trim(),
      apellido.trim(),
      telefono.trim(),
      email?.trim() || null,
      servicio?.trim() || null,
      fecha_preferida || null,
      notas?.trim() || null,
    ]
  )

  res.status(201).json({ ok: true, message: 'Solicitud recibida', solicitud: rows[0] })
}

async function listarSolicitudes(req, res) {
  const { estado } = req.query
  const where  = estado ? 'WHERE estado = $1' : ''
  const params = estado ? [estado] : []
  const { rows } = await pool.query(
    `SELECT * FROM solicitudes_cita ${where} ORDER BY created_at DESC LIMIT 100`,
    params
  )
  res.json(rows)
}

async function actualizarEstado(req, res) {
  const { id } = req.params
  const { estado } = req.body
  const valid = ['pendiente', 'contactada', 'convertida', 'cancelada']
  if (!valid.includes(estado)) return res.status(400).json({ error: 'estado inválido' })
  const { rows } = await pool.query(
    `UPDATE solicitudes_cita SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [estado, id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' })
  res.json(rows[0])
}

module.exports = { crearSolicitud, listarSolicitudes, actualizarEstado }
