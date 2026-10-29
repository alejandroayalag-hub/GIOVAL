import api from './client';

export const crearPresupuesto       = (data) => api.post('/presupuestos', data).then(r => r.data);
export const getPresupuesto         = (id)   => api.get(`/presupuestos/${id}`).then(r => r.data);
export const getPresupuestosPaciente = (pid) => api.get(`/presupuestos/paciente/${pid}`).then(r => r.data);
