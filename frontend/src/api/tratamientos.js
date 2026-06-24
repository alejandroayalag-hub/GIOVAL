import api from './client';

export const getTratamientos = () => api.get('/tratamientos').then(r => r.data);
export const getTratamientosActivos = () => api.get('/tratamientos/activos').then(r => r.data);
export const createTratamiento = (data) => api.post('/tratamientos', data).then(r => r.data);
export const updateTratamiento = (id, data) => api.put(`/tratamientos/${id}`, data).then(r => r.data);
export const updatePrecioTratamiento = (id, precio) => api.patch(`/tratamientos/${id}/precio`, { precio }).then(r => r.data);
