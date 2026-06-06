import api from './client';

export const getCitas = ({ fecha, desde, hasta }) => {
  const params = {};
  if (fecha) params.fecha = fecha;
  else if (desde && hasta) { params.desde = desde; params.hasta = hasta; }
  return api.get('/citas', { params }).then(r => r.data);
};

export const createCita = (data) => api.post('/citas', data).then(r => r.data);
export const updateCita = (id, data) => api.put(`/citas/${id}`, data).then(r => r.data);
export const deleteCita = (id) => api.delete(`/citas/${id}`).then(r => r.data);
