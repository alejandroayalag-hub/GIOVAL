import api from './client';

export const getConsentimiento = (tratamientoId) =>
  api.get(`/consentimientos/tratamiento/${tratamientoId}`).then(r => r.data);

export const saveConsentimiento = (tratamientoId, data) =>
  api.put(`/consentimientos/tratamiento/${tratamientoId}`, data).then(r => r.data);

export const getConsentimientoGeneral = (codigo) =>
  api.get(`/consentimientos/general/${codigo}`).then(r => r.data);

export const saveConsentimientoGeneral = (codigo, data) =>
  api.put(`/consentimientos/general/${codigo}`, data).then(r => r.data);

export const getFirmadosByPaciente = (pacienteId) =>
  api.get(`/consentimientos/firmados/paciente/${pacienteId}`).then(r => r.data);

export const getFirmadoByCita = (citaId) =>
  api.get(`/consentimientos/firmados/cita/${citaId}`).then(r => r.data);

export const firmarConsentimiento = (data) =>
  api.post('/consentimientos/firmar', data).then(r => r.data);

export const getIneReciente = (pacienteId) =>
  api.get(`/consentimientos/ine-reciente/${pacienteId}`).then(r => r.data);

export const getIneFirmado = (firmadoId) =>
  api.get(`/consentimientos/firmados/${firmadoId}/ine`).then(r => r.data);
