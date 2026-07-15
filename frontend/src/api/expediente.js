import api from './client';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3008';

// CIE-10
export const searchCie10 = (q) =>
  api.get('/expediente/cie10', { params: { q } }).then(r => r.data);

// Diagnósticos
export const getDiagnosticos = (pacienteId) =>
  api.get(`/expediente/diagnosticos/paciente/${pacienteId}`).then(r => r.data);
export const createDiagnostico = (data) =>
  api.post('/expediente/diagnosticos', data).then(r => r.data);
export const updateDiagnostico = (id, data) =>
  api.put(`/expediente/diagnosticos/${id}`, data).then(r => r.data);
export const deleteDiagnostico = (id) =>
  api.delete(`/expediente/diagnosticos/${id}`).then(r => r.data);

// Recetas
export const getRecetas = (pacienteId) =>
  api.get(`/expediente/recetas/paciente/${pacienteId}`).then(r => r.data);
export const createReceta = (data) =>
  api.post('/expediente/recetas', data).then(r => r.data);
export const deleteReceta = (id) =>
  api.delete(`/expediente/recetas/${id}`).then(r => r.data);

// Notas médicas libres
export const getNotasMedicas = (pacienteId) =>
  api.get(`/expediente/notas-medicas/paciente/${pacienteId}`).then(r => r.data);
export const createNotaMedica = (data) =>
  api.post('/expediente/notas-medicas', data).then(r => r.data);
export const updateNotaMedica = (id, contenido) =>
  api.put(`/expediente/notas-medicas/${id}`, { contenido }).then(r => r.data);
export const deleteNotaMedica = (id) =>
  api.delete(`/expediente/notas-medicas/${id}`).then(r => r.data);

// Archivos
export const getArchivos = (pacienteId) =>
  api.get(`/expediente/archivos/paciente/${pacienteId}`).then(r => r.data);
export const uploadArchivo = (formData) =>
  api.post('/expediente/archivos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
export const deleteArchivo = (id) =>
  api.delete(`/expediente/archivos/${id}`).then(r => r.data);

export const archivoUrl = (archivo) => `${BASE_URL}/${archivo}`;
