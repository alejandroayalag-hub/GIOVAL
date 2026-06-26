import api from './client';

export const getInsumos           = ()            => api.get('/insumos').then(r => r.data);
export const getCategoriasInsumos = ()            => api.get('/insumos/categorias').then(r => r.data);
export const updateInsumo         = (id, d)       => api.put(`/insumos/${id}`, d).then(r => r.data);
export const getKits              = ()            => api.get('/kits').then(r => r.data);
export const getKit               = (id)          => api.get(`/kits/${id}`).then(r => r.data);
export const updateKitItem        = (id, itemId, d) => api.put(`/kits/${id}/items/${itemId}`, d).then(r => r.data);
export const getCostoCabina       = (tratId)      => api.get(`/tratamientos/${tratId}/costo-cabina`).then(r => r.data);
