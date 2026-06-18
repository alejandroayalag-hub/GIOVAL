import { apiClient } from './client';
import { Patient } from '../types/index';

export async function getPatients(): Promise<Patient[]> {
  const response = await apiClient.get('/pacientes');
  return response.data;
}

export async function getPatient(id: string): Promise<Patient> {
  const response = await apiClient.get(`/pacientes/${id}`);
  return response.data;
}

export async function createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
  const response = await apiClient.post('/pacientes', patient);
  return response.data;
}

export async function updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
  const response = await apiClient.put(`/pacientes/${id}`, patient);
  return response.data;
}
