const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const { crearSolicitud } = require('../controllers/solicitudesPublicController')
const agenda = require('../controllers/agendaOnlineController')

// Consultas de agenda: generoso (el calendario hace varias llamadas por visita)
const consultaLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false })
// Escrituras: reservar / reagendar / cancelar
const escrituraLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos, intenta más tarde o escríbenos por WhatsApp' } })

router.post('/solicitudes', crearSolicitud)

router.get('/agenda/servicios', consultaLimiter, agenda.servicios)
router.get('/agenda/especialistas', consultaLimiter, agenda.especialistas)
router.get('/agenda/dias', consultaLimiter, agenda.dias)
router.get('/agenda/horarios', consultaLimiter, agenda.horarios)
router.post('/agenda/reservar', escrituraLimiter, agenda.reservar)
router.post('/agenda/mp/webhook', agenda.webhookMP)
router.get('/agenda/cita/:token', consultaLimiter, agenda.verCita)
router.post('/agenda/cita/:token/reagendar', escrituraLimiter, agenda.reagendar)
router.post('/agenda/cita/:token/cancelar', escrituraLimiter, agenda.cancelar)

module.exports = router
