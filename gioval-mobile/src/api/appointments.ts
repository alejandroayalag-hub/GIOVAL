import { apiClient } from './client';

export interface Appointment {
  id: string;
  paciente_id: string;
  fecha: string;
  hora: string;
  tipo: string;
  estado: string;
}

export async function getAppointments(): Promise<Appointment[]> {
  const response = await apiClient.get('/citas');
  return response.data;
}

export async function getAppointment(id: string): Promise<Appointment> {
  const response = await apiClient.get(`/citas/${id}`);
  return response.data;
}

export async function createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
  const response = await apiClient.post('/citas', appointment);
  return response.data;
}

export async function checkInAppointment(id: string): Promise<void> {
  await apiClient.post(`/citas/${id}/check-in`);
}
