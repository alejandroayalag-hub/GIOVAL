import { apiClient } from './client';
import { Procedure } from '../types/index';

export async function getProcedures(): Promise<Procedure[]> {
  const response = await apiClient.get('/procedimientos');
  return response.data;
}

export async function createProcedure(procedure: Omit<Procedure, 'id'>): Promise<Procedure> {
  const response = await apiClient.post('/procedimientos', procedure);
  return response.data;
}

export async function uploadProcedurePhoto(
  procedureId: string,
  photoUri: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'procedure-photo.jpg',
  } as any);

  const response = await apiClient.post(`/procedimientos/${procedureId}/fotos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
