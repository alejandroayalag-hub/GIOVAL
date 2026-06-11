import api from './client'

export const getSolicitudes = (estado) =>
  api.get('/solicitudes-admin', { params: estado ? { estado } : {} }).then(r => r.data)

export const actualizarEstado = (id, estado) =>
  api.patch(`/solicitudes-admin/${id}/estado`, { estado }).then(r => r.data)
