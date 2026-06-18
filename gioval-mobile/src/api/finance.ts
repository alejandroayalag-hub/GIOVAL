import { apiClient } from './client';
import { Transaction } from '../types/index';

export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiClient.get('/finanzas/transacciones');
  return response.data;
}

export async function getSummary(): Promise<{ today: number; month: number; year: number }> {
  const response = await apiClient.get('/finanzas/resumen');
  return response.data;
}

export async function createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
  const response = await apiClient.post('/finanzas/transacciones', transaction);
  return response.data;
}
