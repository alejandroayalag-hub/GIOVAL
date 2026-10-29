import api from './client';

export const getPlanes                  = (pid) => api.get(`/plan-tratamientos/paciente/${pid}`).then(r => r.data);
export const getHistorialProcedimientos = (pid) => api.get(`/plan-tratamientos/paciente/${pid}/historial`).then(r => r.data);
export const crearPlanDesdeCita          = (citaId) => api.post(`/plan-tratamientos/desde-cita/${citaId}`).then(r => r.data);
