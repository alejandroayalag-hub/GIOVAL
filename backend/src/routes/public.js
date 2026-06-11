const router = require('express').Router()
const { crearSolicitud } = require('../controllers/solicitudesPublicController')

router.post('/solicitudes', crearSolicitud)

module.exports = router
