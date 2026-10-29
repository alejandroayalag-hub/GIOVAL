// node frontend/src/utils/presupuesto.test.js
import assert from 'node:assert';
import { calcularItem, totalPresupuesto, promosAplicables } from './presupuesto.js';

// misma fórmula que backend/src/services/promociones.js
assert.strictEqual(calcularItem({ precio_unitario: 1000, sesiones: 3, descuento_pct: 20 }).subtotal, 2400);
assert.strictEqual(calcularItem({ precio_unitario: 333.33, sesiones: 3, descuento_pct: 15 }).subtotal, 849.99);
assert.strictEqual(totalPresupuesto([{ subtotal: 2400 }, { subtotal: 500 }]), 2900);

const promos = [
  { id: 1, solo_completo: true, tratamiento_ids: [7] },
  { id: 2, solo_completo: false, tratamiento_ids: [7, 8] },
];
assert.deepStrictEqual(promosAplicables(promos, 7, 'completo').map(p => p.id), [1, 2]);
assert.deepStrictEqual(promosAplicables(promos, 7, 'por_sesion').map(p => p.id), [2]);
assert.deepStrictEqual(promosAplicables(promos, 9, 'completo'), []);
console.log('✓ presupuesto');
