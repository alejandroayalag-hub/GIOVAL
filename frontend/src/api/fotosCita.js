import api from './client';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3008';

export const getFotosByCita = (cita_id) =>
  api.get(`/fotos-cita?cita_id=${cita_id}`).then(r => r.data);

export const uploadFotoCita = (formData) =>
  api.post('/fotos-cita', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const deleteFotoCita = (id) =>
  api.delete(`/fotos-cita/${id}`).then(r => r.data);

export const fotoUrl = (archivo) => `${BASE_URL}/${archivo}`;
