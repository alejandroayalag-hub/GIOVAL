import api from './client';

export const getCuentasPorPagar   = (estatus) => api.get('/cuentas-por-pagar', { params: estatus ? { estatus } : {} }).then(r => r.data);
export const getResumenCXP        = ()        => api.get('/cuentas-por-pagar/resumen').then(r => r.data);
export const createCuentaPorPagar = (d)       => api.post('/cuentas-por-pagar', d).then(r => r.data);
export const updateCuentaPorPagar = (id, d)   => api.put(`/cuentas-por-pagar/${id}`, d).then(r => r.data);
export const deleteCuentaPorPagar = (id)      => api.delete(`/cuentas-por-pagar/${id}`).then(r => r.data);
