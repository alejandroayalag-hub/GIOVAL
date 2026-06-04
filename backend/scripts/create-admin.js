require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

async function main() {
  const hash = await bcrypt.hash('Admin123!', 10);
  await pool.query(
    'INSERT INTO usuarios (email, password, nombre) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
    ['admin@grupoata.com', hash, 'Administrador']
  );
  console.log('Usuario admin creado: admin@grupoata.com / Admin123!');
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
