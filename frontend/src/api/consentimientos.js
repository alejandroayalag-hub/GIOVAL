import api from './client';

export const getConsentimiento = (tratamientoId) =>
  api.get(`/consentimientos/tratamiento/${tratamientoId}`).then(r => r.data);

export const saveConsentimiento = (tratamientoId, data) =>
  api.put(`/consentimientos/tratamiento/${tratamientoId}`, data).then(r => r.data);

export const getFirmadosByPaciente = (pacienteId) =>
  api.get(`/consentimientos/firmados/paciente/${pacienteId}`).then(r => r.data);

export const getFirmadoByCita = (citaId) =>
  api.get(`/consentimientos/firmados/cita/${citaId}`).then(r => r.data);

export const firmarConsentimiento = (data) =>
  api.post('/consentimientos/firmar', data).then(r => r.data);
