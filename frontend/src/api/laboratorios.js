import api from './client';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3008';

export const getLaboratoriosByPaciente = (paciente_id) =>
  api.get(`/laboratorios?paciente_id=${paciente_id}`).then(r => r.data);

export const uploadLaboratorio = (formData) =>
  api.post('/laboratorios', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const deleteLaboratorio = (id) =>
  api.delete(`/laboratorios/${id}`).then(r => r.data);

export const archivoUrl = (archivo) => `${BASE_URL}/${archivo}`;
