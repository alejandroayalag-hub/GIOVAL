import { apiClient } from './client';
import { AuthResponse } from '../types/index';

export async function loginWithCredentials(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
}

export async function verifyToken(): Promise<boolean> {
  try {
    await apiClient.get('/auth/verify');
    return true;
  } catch {
    return false;
  }
}
