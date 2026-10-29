// node frontend/src/utils/resumenPlan.test.js
import assert from 'node:assert';
import { resumenPlan } from './resumenPlan.js';

// nuevo formato: dx libre + CIE-10 + tratamientos
assert.deepStrictEqual(resumenPlan({
  plan: {
    diagnostico_texto: 'Acné grado II', diagnostico_cie10: 'L70.0', diagnostico_cie10_desc: 'Acné vulgar',
    tratamientos: [
      { tratamiento_id: 3, tratamiento_nombre: 'Dermapen', sesiones: 3, frecuencia: 'cada 15 días' },
      { tratamiento_id: 9, sesiones: 1, frecuencia: '' },
    ],
  },
}), [
  ['Diagnóstico', 'Acné grado II · CIE-10 L70.0 Acné vulgar'],
  ['Tratamientos propuestos', 'Dermapen — 3 sesiones, cada 15 días; Tratamiento #9 — 1 sesión'],
]);

// valoración vieja: solo texto libre
assert.deepStrictEqual(resumenPlan({ diagnostico: 'Flacidez', tratamientos_propuestos: 'HIFU', sesiones: '2' }), [
  ['Diagnóstico', 'Flacidez'], ['Tratamientos propuestos', 'HIFU'], ['Sesiones / frecuencia', '2'],
]);

// nada capturado
assert.deepStrictEqual(resumenPlan({ peso: 70 }), []);
console.log('✓ resumenPlan');
