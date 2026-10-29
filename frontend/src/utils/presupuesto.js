// Copia de la fórmula del servidor (backend/src/services/promociones.js) solo para vista previa;
// el total que vale es el que regresa el servidor al firmar.
const round2 = n => Math.round(n * 100) / 100;

export function calcularItem({ precio_unitario, sesiones, descuento_pct }) {
  return { subtotal: round2(Number(precio_unitario) * Number(sesiones) * (1 - Number(descuento_pct || 0) / 100)) };
}

export const totalPresupuesto = items => round2(items.reduce((s, i) => s + i.subtotal, 0));

export const promosAplicables = (promos, tratamientoId, modalidad) =>
  promos.filter(p => p.tratamiento_ids.includes(tratamientoId) && (!p.solo_completo || modalidad === 'completo'));

export const pesos = n => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
