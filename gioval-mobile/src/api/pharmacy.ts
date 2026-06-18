import { apiClient } from './client';

export interface PharmacyProduct {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  precio_costo: number;
  stock: number;
}

export async function getProducts(): Promise<PharmacyProduct[]> {
  const response = await apiClient.get('/farmacia/productos');
  return response.data;
}

export async function createProduct(product: Omit<PharmacyProduct, 'id'>): Promise<PharmacyProduct> {
  const response = await apiClient.post('/farmacia/productos', product);
  return response.data;
}

export async function createPharmacySale(items: any[]): Promise<{ id: string }> {
  const response = await apiClient.post('/farmacia/ventas', { items });
  return response.data;
}
