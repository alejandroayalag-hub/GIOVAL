const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

async function seed() {
  const hash = await bcrypt.hash('Admin123!', 10);
  await pool.query(
    `INSERT INTO usuarios (email, password, nombre, rol)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    ['admin@elys.com', hash, 'Administrador Elys', 'admin']
  );
  console.log('✓ Admin seeded: admin@elys.com / Admin123!');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
