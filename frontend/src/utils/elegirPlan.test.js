// node frontend/src/utils/elegirPlan.test.js
import assert from 'node:assert';
import { elegirPlan } from './elegirPlan.js';

// planes aún no cargan (o falló la carga): nunca tocar lo ligado
assert.strictEqual(elegirPlan({ candidatos: null, actual: 7 }), 7);
// ligado sigue entre candidatos (2 planes): se respeta
assert.strictEqual(elegirPlan({ candidatos: [5, 7], actual: 7 }), 7);
// un solo candidato y nada ligado: se liga solo
assert.strictEqual(elegirPlan({ candidatos: [5], actual: '' }), 5);
// varios candidatos y nada ligado: hay que elegir
assert.strictEqual(elegirPlan({ candidatos: [5, 7], actual: '' }), '');
// cambió el tratamiento: el ligado ya no es candidato
assert.strictEqual(elegirPlan({ candidatos: [], actual: 7 }), '');
console.log('✓ elegirPlan');
