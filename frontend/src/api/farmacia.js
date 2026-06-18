import api from './client';

// Productos
export const getProductos = (nombre, proveedor_id, stock_bajo) => {
  const params = {};
  if (nombre) params.nombre = nombre;
  if (proveedor_id) params.proveedor_id = proveedor_id;
  if (stock_bajo) params.stock_bajo = stock_bajo;
  return api.get('/farmacia/productos', { params }).then(r => r.data);
};

export const getProducto = (id) =>
  api.get(`/farmacia/productos/${id}`).then(r => r.data);

export const createProducto = (data) =>
  api.post('/farmacia/productos', data).then(r => r.data);

export const updateProducto = (id, data) =>
  api.put(`/farmacia/productos/${id}`, data).then(r => r.data);

export const deleteProducto = (id) =>
  api.delete(`/farmacia/productos/${id}`).then(r => r.data);

// Proveedores
export const getProveedores = () =>
  api.get('/farmacia/proveedores').then(r => r.data);

export const createProveedor = (data) =>
  api.post('/farmacia/proveedores', data).then(r => r.data);

export const updateProveedor = (id, data) =>
  api.put(`/farmacia/proveedores/${id}`, data).then(r => r.data);

export const deleteProveedor = (id) =>
  api.delete(`/farmacia/proveedores/${id}`).then(r => r.data);

// Ventas
export const getVentas = (params = {}) =>
  api.get('/farmacia/ventas', { params }).then(r => r.data);

export const getVenta = (id) =>
  api.get(`/farmacia/ventas/${id}`).then(r => r.data);

export const createVenta = (data) =>
  api.post('/farmacia/ventas', data).then(r => r.data);

export const agregarItemVenta = (ventaId, data) =>
  api.post(`/farmacia/ventas/${ventaId}/items`, data).then(r => r.data);

export const removerItemVenta = (ventaId, itemId) =>
  api.delete(`/farmacia/ventas/${ventaId}/items/${itemId}`).then(r => r.data);

export const pagarVenta = (ventaId, data) =>
  api.post(`/farmacia/ventas/${ventaId}/pagar`, data).then(r => r.data);

export const cancelarVenta = (ventaId) =>
  api.post(`/farmacia/ventas/${ventaId}/cancelar`).then(r => r.data);

// Caja
export const getCajaAbierta = () =>
  api.get('/farmacia/caja/turno-actual').then(r => r.data).catch(() => ({ abierta: false }));

export const abrirCaja = (efectivo_inicial) =>
  api.post('/farmacia/caja/abrir', { efectivo_inicial }).then(r => r.data);

export const cerrarCaja = (cajaId, efectivo_final) =>
  api.put(`/farmacia/caja/${cajaId}/cerrar`, { efectivo_final }).then(r => r.data);

export const getHistorialCaja = (limit = 10) =>
  api.get('/farmacia/caja/historial', { params: { limit } }).then(r => r.data);

// Reportes
export const getResumenVentas = (fecha_desde, fecha_hasta, empleado_id) => {
  const params = { fecha_desde, fecha_hasta };
  if (empleado_id) params.empleado_id = empleado_id;
  return api.get('/farmacia/reportes/resumen', { params }).then(r => r.data);
};

export const getStockBajo = () =>
  api.get('/farmacia/reportes/stock-bajo').then(r => r.data);

export const getTopProductos = (fecha_desde, fecha_hasta, limite = 10) =>
  api.get('/farmacia/reportes/top-productos', { params: { fecha_desde, fecha_hasta, limite } }).then(r => r.data);

export const getGanancias = (fecha_desde, fecha_hasta) =>
  api.get('/farmacia/reportes/ganancias', { params: { fecha_desde, fecha_hasta } }).then(r => r.data);

export const getVentasPorEmpleado = (fecha_desde, fecha_hasta) =>
  api.get('/farmacia/reportes/por-empleado', { params: { fecha_desde, fecha_hasta } }).then(r => r.data);
