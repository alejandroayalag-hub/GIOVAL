import api from './client';

export const getNotasByCita = (citaId) =>
  api.get('/notas-visita', { params: { cita_id: citaId } }).then(r => r.data);

export const getNotasByPaciente = (pacienteId) =>
  api.get(`/notas-visita/paciente/${pacienteId}`).then(r => r.data);

export const createNota = (data) => api.post('/notas-visita', data).then(r => r.data);
export const updateNota = (id, data) => api.put(`/notas-visita/${id}`, data).then(r => r.data);
