import api from './client';

export const getPromociones   = ()              => api.get('/promociones').then(r => r.data);
export const getPromosVigentes = (tratIds)      => api.get('/promociones/vigentes', { params: { tratamientos: tratIds.join(',') } }).then(r => r.data);
export const createPromocion  = (data)          => api.post('/promociones', data).then(r => r.data);
export const updatePromocion  = (id, data)      => api.put(`/promociones/${id}`, data).then(r => r.data);
export const desactivarPromocion = (id)         => api.delete(`/promociones/${id}`).then(r => r.data);
