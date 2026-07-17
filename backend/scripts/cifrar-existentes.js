// One-time: cifra firma_imagen/ine_frente/ine_reverso ya existentes en consentimientos_firmados.
// Idempotente — salta lo que ya empieza con enc1:. Correr: node scripts/cifrar-existentes.js
require('dotenv').config();
const pool = require('../src/db/pool');
const { encrypt } = require('../src/utils/cifrado');

(async () => {
  const { rows } = await pool.query(
    'SELECT id, firma_imagen, ine_frente, ine_reverso FROM consentimientos_firmados'
  );
  let cifrados = 0, saltados = 0;
  for (const r of rows) {
    const pendiente = ['firma_imagen', 'ine_frente', 'ine_reverso']
      .filter(c => r[c] && !r[c].startsWith('enc1:'));
    if (!pendiente.length) { saltados++; continue; }
    const sets = pendiente.map((c, i) => `${c} = $${i + 2}`).join(', ');
    await pool.query(
      `UPDATE consentimientos_firmados SET ${sets} WHERE id = $1`,
      [r.id, ...pendiente.map(c => encrypt(r[c]))]
    );
    cifrados++;
  }
  console.log(`Cifrados: ${cifrados}, ya cifrados (saltados): ${saltados}, total: ${rows.length}`);
  await pool.end();
})();
