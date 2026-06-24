import api from './client';

export const getDocsByPaciente = (pid)       => api.get(`/documentos-clinicos/paciente/${pid}`).then(r => r.data);
export const getDocsByTipo     = (pid, tipo) => api.get(`/documentos-clinicos/paciente/${pid}/${tipo}`).then(r => r.data);
export const createDoc         = (body)      => api.post('/documentos-clinicos', body).then(r => r.data);
export const updateDoc         = (id, body)  => api.put(`/documentos-clinicos/${id}`, body).then(r => r.data);
export const deleteDoc         = (id)        => api.delete(`/documentos-clinicos/${id}`).then(r => r.data);
