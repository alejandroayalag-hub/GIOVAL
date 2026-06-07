import api from './client';

export const getPacientes = () => api.get('/pacientes').then(r => r.data);
export const buscarPacientes = (q) => api.get('/pacientes/buscar', { params: { q } }).then(r => r.data);
export const getPaciente = (id) => api.get(`/pacientes/${id}`).then(r => r.data);
export const createPaciente = (data) => api.post('/pacientes', data).then(r => r.data);
export const updatePaciente = (id, data) => api.put(`/pacientes/${id}`, data).then(r => r.data);
export const deletePaciente = (id) => api.delete(`/pacientes/${id}`).then(r => r.data);
export const uploadFotoPaciente = (id, file) => {
  const fd = new FormData();
  fd.append('foto', file);
  return api.post(`/pacientes/${id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
