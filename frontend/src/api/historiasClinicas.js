import api from './client';

export const getHistoria = (pacienteId) =>
  api.get(`/historias-clinicas/${pacienteId}`).then(r => r.data);

export const saveHistoria = (pacienteId, data) =>
  api.put(`/historias-clinicas/${pacienteId}`, data).then(r => r.data);
