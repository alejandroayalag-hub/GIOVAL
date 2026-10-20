import api from './client';

export const getBandeja = () => api.get('/agenda-online').then(r => r.data);
export const confirmarCita = (id) => api.post(`/agenda-online/${id}/confirmar`).then(r => r.data);
export const rechazarCita = (id) => api.post(`/agenda-online/${id}/rechazar`).then(r => r.data);
export const registrarAnticipo = (id, forma_pago) => api.post(`/agenda-online/${id}/anticipo`, { forma_pago }).then(r => r.data);
export const marcarDevuelto = (id, forma_pago) => api.post(`/agenda-online/${id}/devuelto`, { forma_pago }).then(r => r.data);
export const getTratamientosDeEmpleada = (empleadoId) => api.get(`/agenda-online/especialistas/${empleadoId}`).then(r => r.data);
export const guardarTratamientosDeEmpleada = (empleadoId, tratamiento_ids) =>
  api.put(`/agenda-online/especialistas/${empleadoId}`, { tratamiento_ids }).then(r => r.data);
