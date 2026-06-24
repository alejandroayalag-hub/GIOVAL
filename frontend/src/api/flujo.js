import api from './client';

export const getFlujoHoy       = ()             => api.get('/flujo/hoy').then(r => r.data);
export const checkinCita       = (cita_id, data) => api.post(`/flujo/${cita_id}/checkin`, data).then(r => r.data);
export const avanzarFlujo      = (cita_id)       => api.patch(`/flujo/${cita_id}/avanzar`).then(r => r.data);
export const getConsultorios   = ()             => api.get('/consultorios').then(r => r.data);
export const createConsultorio = (data)          => api.post('/consultorios', data).then(r => r.data);
export const updateConsultorio = (id, data)      => api.put(`/consultorios/${id}`, data).then(r => r.data);
