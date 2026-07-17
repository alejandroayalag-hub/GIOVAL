// Cifrado at-rest para datos sensibles (INE, firmas) — AES-256-GCM.
// Llave: CIFRADO_KEY en .env (64 hex chars = 32 bytes). Nunca en git ni en backups.
// Formato: enc1:<iv b64>:<authTag b64>:<ciphertext b64>
// decrypt() deja pasar valores legacy sin prefijo enc1: (datos previos al cifrado).
const crypto = require('crypto');

const PREFIJO = 'enc1:';

function getKey() {
  const hex = process.env.CIFRADO_KEY;
  if (!hex || hex.length !== 64) throw new Error('CIFRADO_KEY faltante o inválida (se esperan 64 hex chars)');
  return Buffer.from(hex, 'hex');
}

function encrypt(texto) {
  if (texto == null || texto === '') return texto;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  return PREFIJO + [iv, cipher.getAuthTag(), ct].map(b => b.toString('base64')).join(':');
}

function decrypt(valor) {
  if (valor == null || typeof valor !== 'string' || !valor.startsWith(PREFIJO)) return valor;
  const [iv, tag, ct] = valor.slice(PREFIJO.length).split(':').map(s => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };

// Self-check: node src/utils/cifrado.js
if (require.main === module) {
  process.env.CIFRADO_KEY = crypto.randomBytes(32).toString('hex');
  const assert = require('assert');
  assert.strictEqual(decrypt(encrypt('data:image/jpeg;base64,ABC123')), 'data:image/jpeg;base64,ABC123');
  assert.strictEqual(decrypt('texto-legacy-sin-cifrar'), 'texto-legacy-sin-cifrar');
  assert.strictEqual(encrypt(null), null);
  assert.strictEqual(decrypt(null), null);
  assert.ok(encrypt('x').startsWith('enc1:'));
  assert.notStrictEqual(encrypt('x'), encrypt('x')); // IV aleatorio
  console.log('cifrado.js: self-check OK');
}
