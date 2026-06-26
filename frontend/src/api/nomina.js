import api from './client';

export const getNomina        = (mes)     => api.get('/nomina', { params: { mes } }).then(r => r.data);
export const getResumenNomina = (mes)     => api.get('/nomina/resumen', { params: { mes } }).then(r => r.data);
export const createNomina     = (d)       => api.post('/nomina', d).then(r => r.data);
export const updateNomina     = (id, d)   => api.put(`/nomina/${id}`, d).then(r => r.data);
export const deleteNomina     = (id)      => api.delete(`/nomina/${id}`).then(r => r.data);
