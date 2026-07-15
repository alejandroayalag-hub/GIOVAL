import api from './client';

export const getInsumos           = ()            => api.get('/insumos').then(r => r.data);
export const getCategoriasInsumos = ()            => api.get('/insumos/categorias').then(r => r.data);
export const createInsumo         = (d)           => api.post('/insumos', d).then(r => r.data);
export const updateInsumo         = (id, d)       => api.put(`/insumos/${id}`, d).then(r => r.data);
export const getInsumoByBarcode   = (codigo)      => api.get(`/insumos/barcode/${encodeURIComponent(codigo)}`).then(r => r.data);
export const entradaInsumo        = (id, envases) => api.post(`/insumos/${id}/entrada`, { envases }).then(r => r.data);
export const getKits              = ()            => api.get('/kits').then(r => r.data);
export const getKit               = (id)          => api.get(`/kits/${id}`).then(r => r.data);
export const addKitItem           = (id, d)       => api.post(`/kits/${id}/items`, d).then(r => r.data);
export const updateKitItem        = (id, itemId, d) => api.put(`/kits/${id}/items/${itemId}`, d).then(r => r.data);
export const removeKitItem        = (id, itemId)  => api.delete(`/kits/${id}/items/${itemId}`).then(r => r.data);
export const getCostoCabina       = (tratId)      => api.get(`/tratamientos/${tratId}/costo-cabina`).then(r => r.data);
export const getCitaInsumos       = (citaId)      => api.get(`/citas/${citaId}/insumos`).then(r => r.data);
export const confirmarCitaInsumos = (citaId, items) => api.post(`/citas/${citaId}/insumos/confirmar`, { items }).then(r => r.data);
