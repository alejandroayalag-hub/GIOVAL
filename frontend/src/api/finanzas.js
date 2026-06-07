// frontend/src/api/finanzas.js
import api from './client';

// Categorías
export const getCategorias   = ()       => api.get('/categorias-movimiento').then(r => r.data);
export const createCategoria = (data)   => api.post('/categorias-movimiento', data).then(r => r.data);
export const updateCategoria = (id, d)  => api.put(`/categorias-movimiento/${id}`, d).then(r => r.data);
export const deleteCategoria = (id)     => api.delete(`/categorias-movimiento/${id}`).then(r => r.data);

// Movimientos
export const getMovimientos        = (params = {}) => api.get('/movimientos', { params }).then(r => r.data);
export const getResumenMovimientos = (params)      => api.get('/movimientos/resumen', { params }).then(r => r.data);
export const createMovimiento      = (data)        => api.post('/movimientos', data).then(r => r.data);
export const updateMovimiento      = (id, data)    => api.put(`/movimientos/${id}`, data).then(r => r.data);
export const deleteMovimiento      = (id)          => api.delete(`/movimientos/${id}`).then(r => r.data);

// Cortes de caja
export const getCorteHoy  = ()     => api.get('/cortes-caja/hoy').then(r => r.data);
export const cerrarCorte  = (data) => api.post('/cortes-caja/cerrar', data).then(r => r.data);
export const getCortes    = ()     => api.get('/cortes-caja').then(r => r.data);
export const getCorteById = (id)   => api.get(`/cortes-caja/${id}`).then(r => r.data);
