# Elys — Plan de Implementación

> **Para agentes:** SUB-SKILL REQUERIDO: Usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar tarea por tarea. Los pasos usan sintaxis checkbox (`- [ ]`) para seguimiento.

**Goal:** Construir el sistema de gestión para clínica Elys: fork de RHATA con branding propio, rol asistente, y módulo de citas con calendario diario y semanal.

**Architecture:** Fork completo de `~/rhata/` hacia `~/elys/`. Se ajustan puertos, credenciales y branding. Se agrega columna `rol` a `usuarios`, dos nuevas tablas (`tratamientos`, `citas`) y sus controladores. El frontend hereda todas las páginas de RHATA y añade `CitasPage`, `TratamientosPage` y tres componentes de calendario.

**Tech Stack:** React 19 + Vite 8, Node.js + Express 5, PostgreSQL 16 (Docker), JWT 8h, Tailwind CSS v4, Axios.

---

## Mapa de archivos

### Backend — nuevos o modificados
| Acción | Archivo |
|--------|---------|
| Crear | `backend/src/db/migrations/007_rol_usuario.sql` |
| Crear | `backend/src/db/migrations/008_citas.sql` |
| Crear | `backend/src/db/migrations/009_seed_tratamientos.sql` |
| Crear | `backend/src/scripts/seed_admin.js` |
| Modificar | `backend/src/routes/auth.js` — incluir `rol` en JWT y respuesta |
| Crear | `backend/src/models/tratamiento.js` |
| Crear | `backend/src/models/cita.js` |
| Crear | `backend/src/controllers/tratamientosController.js` |
| Crear | `backend/src/controllers/citasController.js` |
| Crear | `backend/src/routes/tratamientos.js` |
| Crear | `backend/src/routes/citas.js` |
| Modificar | `backend/src/index.js` — registrar nuevas rutas + console.log Elys |
| Modificar | `backend/.env` — puertos y DB Elys |
| Modificar | `docker-compose.yml` — puerto 5439, DB elys |
| Modificar | `deploy.sh` — servidor, paths y PM2 Elys |

### Frontend — nuevos o modificados
| Acción | Archivo |
|--------|---------|
| Modificar | `frontend/vite.config.js` — proxy a puerto 3008 |
| Modificar | `frontend/src/index.css` — variables de color Elys |
| Modificar | `frontend/src/App.jsx` — branding, nav, rutas, leer `rol` |
| Modificar | `frontend/src/pages/LoginPage.jsx` — branding + guardar `rol` |
| Crear | `frontend/src/api/citas.js` |
| Crear | `frontend/src/api/tratamientos.js` |
| Crear | `frontend/src/components/CitaModal.jsx` |
| Crear | `frontend/src/components/CalendarioDia.jsx` |
| Crear | `frontend/src/components/CalendarioSemana.jsx` |
| Crear | `frontend/src/pages/CitasPage.jsx` |
| Crear | `frontend/src/pages/TratamientosPage.jsx` |

---

## Task 1: Fork RHATA → Elys

**Files:**
- Crear: `~/elys/` (fork completo de `~/rhata/`)
- Modificar: `~/elys/docker-compose.yml`
- Crear: `~/elys/backend/.env`
- Modificar: `~/elys/deploy.sh`

- [ ] **Step 1: Copiar RHATA excluyendo node_modules, uploads y .env**

```bash
rsync -a \
  --exclude='node_modules/' \
  --exclude='backend/uploads/' \
  --exclude='backend/.env' \
  --exclude='frontend/dist/' \
  ~/rhata/ ~/elys/
```

- [ ] **Step 2: Verificar estructura copiada**

```bash
find ~/elys -maxdepth 3 -not -path '*/node_modules/*' -type f | sort
```
Expected: Ver todos los .js, .jsx, .sql, docker-compose.yml, deploy.sh, package.json

- [ ] **Step 3: Actualizar docker-compose.yml**

Reemplazar el contenido completo de `~/elys/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: elys
      POSTGRES_USER: elys_user
      POSTGRES_PASSWORD: elys_pass
    ports:
      - "5439:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

> **Nota:** Se removió el mount de migrations porque el runner de migraciones en Node las aplica al arrancar. Esto evita que Docker las aplique dos veces con credenciales distintas.

- [ ] **Step 4: Crear backend/.env**

```bash
cat > ~/elys/backend/.env << 'EOF'
PORT=3008
DB_HOST=localhost
DB_PORT=5439
DB_NAME=elys
DB_USER=elys_user
DB_PASSWORD=elys_pass
UPLOADS_DIR=./uploads
JWT_SECRET=elys_jwt_secret_cambia_en_produccion
EOF
```

- [ ] **Step 5: Actualizar deploy.sh**

Reemplazar `~/elys/deploy.sh` con:

```bash
#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="root@62.238.3.136"

echo "→ Construyendo frontend..."
cd "$ROOT_DIR/frontend"
npm run build

echo "→ Sincronizando backend (sin tocar uploads)..."
rsync -az --delete \
  --exclude='uploads/' \
  --exclude='node_modules/' \
  --exclude='.env' \
  "$ROOT_DIR/backend/" $SERVER:/root/elys/backend/

echo "→ Sincronizando frontend dist..."
rsync -az --delete \
  "$ROOT_DIR/frontend/dist/" $SERVER:/root/elys/frontend/dist/

echo "→ Instalando dependencias y reiniciando..."
ssh $SERVER "cd /root/elys/backend && npm install --omit=dev --silent && pm2 restart elys-backend"

echo "→ Verificando..."
sleep 2
ssh $SERVER "pm2 show elys-backend | grep -E 'status|restarts'"

echo "✓ Deploy Elys completado"
```

```bash
chmod +x ~/elys/deploy.sh
```

- [ ] **Step 6: Inicializar git**

```bash
cd ~/elys && git init && git add -A && git commit -m "feat: fork inicial de RHATA para proyecto Elys"
```

---

## Task 2: Branding — colores, nombre y proxy

**Files:**
- Modificar: `frontend/src/index.css`
- Modificar: `frontend/vite.config.js`
- Modificar: `backend/src/index.js`

- [ ] **Step 1: Actualizar colores en index.css**

Reemplazar `~/elys/frontend/src/index.css`:

```css
@import "tailwindcss";

:root {
  --color-primary:   #cccad8;
  --color-accent:    #aba3ba;
  --color-dark:      #887482;
  --color-sage:      #ced1ca;
  --color-cream:     #f5f2f0;
}

body {
  margin: 0;
  font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--color-cream);
}
```

- [ ] **Step 2: Actualizar proxy en vite.config.js**

Reemplazar `~/elys/frontend/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3008',
      '/uploads': 'http://localhost:3008',
    },
  },
});
```

- [ ] **Step 3: Actualizar console.log del backend**

En `~/elys/backend/src/index.js` cambiar la línea del console.log:

```js
// Antes:
console.log(`Backend RH-ATA corriendo en puerto ${PORT}`);

// Después:
console.log(`Backend Elys corriendo en puerto ${PORT}`);
```

- [ ] **Step 4: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: branding Elys — colores, proxy y nombre backend"
```

---

## Task 3: LoginPage — branding Elys

**Files:**
- Modificar: `frontend/src/pages/LoginPage.jsx`

- [ ] **Step 1: Actualizar LoginPage.jsx con branding Elys**

Reemplazar `~/elys/frontend/src/pages/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('nombre', data.nombre);
      localStorage.setItem('rol', data.rol);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
               style={{ backgroundColor: 'var(--color-primary)' }}>
            <span className="text-2xl font-bold" style={{ color: 'var(--color-dark)' }}>E</span>
          </div>
          <h1 className="font-bold text-xl tracking-wide" style={{ color: 'var(--color-dark)' }}>Elys</h1>
          <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">Clínica de Belleza</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-primary)', '--tw-ring-color': 'var(--color-accent)' }}
              placeholder="admin@elys.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-primary)' }}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: LoginPage con branding Elys y guarda rol en localStorage"
```

---

## Task 4: Migración 007 — rol en usuarios + seed admin

**Files:**
- Crear: `backend/src/db/migrations/007_rol_usuario.sql`
- Crear: `backend/src/scripts/seed_admin.js`
- Modificar: `backend/package.json` — agregar script `seed`

- [ ] **Step 1: Crear migración 007_rol_usuario.sql**

```sql
-- ~/elys/backend/src/db/migrations/007_rol_usuario.sql
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (rol IN ('admin', 'asistente'));
```

- [ ] **Step 2: Crear script seed_admin.js**

```bash
mkdir -p ~/elys/backend/src/scripts
```

Crear `~/elys/backend/src/scripts/seed_admin.js`:

```js
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
```

- [ ] **Step 3: Agregar script seed en package.json**

En `~/elys/backend/package.json`, agregar dentro de `"scripts"`:

```json
"seed": "node src/scripts/seed_admin.js"
```

El bloque `scripts` queda:
```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js",
  "seed": "node src/scripts/seed_admin.js"
},
```

- [ ] **Step 4: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: migración rol en usuarios + script seed admin"
```

---

## Task 5: Actualizar auth — incluir rol en JWT

**Files:**
- Modificar: `backend/src/routes/auth.js`

- [ ] **Step 1: Actualizar routes/auth.js**

Reemplazar `~/elys/backend/src/routes/auth.js`:

```js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, nombre: user.nombre, rol: user.rol });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: auth incluye rol en JWT y respuesta login"
```

---

## Task 6: Migración 008 — tablas tratamientos y citas

**Files:**
- Crear: `backend/src/db/migrations/008_citas.sql`
- Crear: `backend/src/db/migrations/009_seed_tratamientos.sql`

- [ ] **Step 1: Crear migración 008_citas.sql**

```sql
-- ~/elys/backend/src/db/migrations/008_citas.sql
CREATE TABLE IF NOT EXISTS tratamientos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL UNIQUE,
  duracion_min INTEGER NOT NULL DEFAULT 60,
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citas (
  id               SERIAL PRIMARY KEY,
  nombre_paciente  VARCHAR(200) NOT NULL,
  telefono         VARCHAR(20),
  tratamiento_id   INTEGER REFERENCES tratamientos(id) ON DELETE SET NULL,
  empleada_id      INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  fecha_hora       TIMESTAMPTZ NOT NULL,
  notas            TEXT,
  estatus          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                   CHECK (estatus IN ('pendiente', 'realizada', 'cancelada')),
  created_by       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Crear migración 009_seed_tratamientos.sql**

```sql
-- ~/elys/backend/src/db/migrations/009_seed_tratamientos.sql
INSERT INTO tratamientos (nombre, duracion_min) VALUES
  ('Limpieza facial', 60),
  ('Tratamiento antienvejecimiento', 90),
  ('Micropigmentación de cejas', 120),
  ('Depilación láser', 45),
  ('Botox', 30),
  ('Relleno dérmico', 45),
  ('Peeling químico', 60),
  ('Hidratación profunda', 75),
  ('Masaje facial', 45),
  ('Consulta médica', 30)
ON CONFLICT (nombre) DO NOTHING;
```

- [ ] **Step 3: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: migraciones citas y tratamientos + seed inicial"
```

---

## Task 7: Backend — modelo y controlador de tratamientos

**Files:**
- Crear: `backend/src/models/tratamiento.js`
- Crear: `backend/src/controllers/tratamientosController.js`
- Crear: `backend/src/routes/tratamientos.js`

- [ ] **Step 1: Crear models/tratamiento.js**

```js
// ~/elys/backend/src/models/tratamiento.js
const pool = require('../db/pool');

const Tratamiento = {
  async findAll() {
    const { rows } = await pool.query(
      'SELECT * FROM tratamientos ORDER BY nombre'
    );
    return rows;
  },

  async findActivos() {
    const { rows } = await pool.query(
      'SELECT * FROM tratamientos WHERE activo = true ORDER BY nombre'
    );
    return rows;
  },

  async create({ nombre, duracion_min }) {
    const { rows } = await pool.query(
      'INSERT INTO tratamientos (nombre, duracion_min) VALUES ($1, $2) RETURNING *',
      [nombre, duracion_min || 60]
    );
    return rows[0];
  },

  async update(id, { nombre, duracion_min, activo }) {
    const { rows } = await pool.query(
      `UPDATE tratamientos
       SET nombre = COALESCE($1, nombre),
           duracion_min = COALESCE($2, duracion_min),
           activo = COALESCE($3, activo)
       WHERE id = $4 RETURNING *`,
      [nombre, duracion_min, activo, id]
    );
    return rows[0];
  },
};

module.exports = Tratamiento;
```

- [ ] **Step 2: Crear controllers/tratamientosController.js**

```js
// ~/elys/backend/src/controllers/tratamientosController.js
const Tratamiento = require('../models/tratamiento');

exports.list = async (req, res, next) => {
  try {
    const items = await Tratamiento.findAll();
    res.json(items);
  } catch (err) { next(err); }
};

exports.listActivos = async (req, res, next) => {
  try {
    const items = await Tratamiento.findActivos();
    res.json(items);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede crear tratamientos' });
    const { nombre, duracion_min } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    const item = await Tratamiento.create({ nombre, duracion_min });
    res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin puede editar tratamientos' });
    const item = await Tratamiento.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Crear routes/tratamientos.js**

```js
// ~/elys/backend/src/routes/tratamientos.js
const router = require('express').Router();
const ctrl = require('../controllers/tratamientosController');

router.get('/', ctrl.list);
router.get('/activos', ctrl.listActivos);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
```

- [ ] **Step 4: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: modelo, controlador y rutas de tratamientos"
```

---

## Task 8: Backend — modelo y controlador de citas

**Files:**
- Crear: `backend/src/models/cita.js`
- Crear: `backend/src/controllers/citasController.js`
- Crear: `backend/src/routes/citas.js`

- [ ] **Step 1: Crear models/cita.js**

```js
// ~/elys/backend/src/models/cita.js
const pool = require('../db/pool');

const Cita = {
  async findByRango({ desde, hasta }) {
    const { rows } = await pool.query(
      `SELECT c.*, t.nombre AS tratamiento_nombre, t.duracion_min,
              e.nombre AS empleada_nombre, e.apellido_paterno AS empleada_apellido
       FROM citas c
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN empleados e ON e.id = c.empleada_id
       WHERE c.fecha_hora BETWEEN $1 AND $2
       ORDER BY c.fecha_hora`,
      [desde, hasta]
    );
    return rows;
  },

  async create(data) {
    const { nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by } = data;
    const { rows } = await pool.query(
      `INSERT INTO citas (nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by]
    );
    return rows[0];
  },

  async update(id, data) {
    const { nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, estatus } = data;
    const { rows } = await pool.query(
      `UPDATE citas SET
         nombre_paciente = COALESCE($1, nombre_paciente),
         telefono        = COALESCE($2, telefono),
         tratamiento_id  = COALESCE($3, tratamiento_id),
         empleada_id     = COALESCE($4, empleada_id),
         fecha_hora      = COALESCE($5, fecha_hora),
         notas           = COALESCE($6, notas),
         estatus         = COALESCE($7, estatus),
         updated_at      = NOW()
       WHERE id = $8 RETURNING *`,
      [nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, estatus, id]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM citas WHERE id = $1', [id]);
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM citas WHERE id = $1', [id]);
  },
};

module.exports = Cita;
```

- [ ] **Step 2: Crear controllers/citasController.js**

```js
// ~/elys/backend/src/controllers/citasController.js
const Cita = require('../models/cita');

exports.list = async (req, res, next) => {
  try {
    const { desde, hasta, fecha } = req.query;
    let d, h;
    if (fecha) {
      d = `${fecha}T00:00:00`;
      h = `${fecha}T23:59:59`;
    } else if (desde && hasta) {
      d = `${desde}T00:00:00`;
      h = `${hasta}T23:59:59`;
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      d = `${hoy}T00:00:00`;
      h = `${hoy}T23:59:59`;
    }
    const citas = await Cita.findByRango({ desde: d, hasta: h });
    res.json(citas);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas } = req.body;
    if (!nombre_paciente || !fecha_hora) {
      return res.status(400).json({ error: 'nombre_paciente y fecha_hora son requeridos' });
    }
    const cita = await Cita.create({ nombre_paciente, telefono, tratamiento_id, empleada_id, fecha_hora, notas, created_by: req.user.id });
    res.status(201).json(cita);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await Cita.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cita no encontrada' });

    if (existing.estatus === 'realizada' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No puedes editar una cita ya realizada' });
    }

    const cita = await Cita.update(req.params.id, req.body);
    res.json(cita);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const existing = await Cita.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cita no encontrada' });

    if (existing.estatus === 'realizada' && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admin puede eliminar citas realizadas' });
    }

    await Cita.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Crear routes/citas.js**

```js
// ~/elys/backend/src/routes/citas.js
const router = require('express').Router();
const ctrl = require('../controllers/citasController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
```

- [ ] **Step 4: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: modelo, controlador y rutas de citas con control de rol"
```

---

## Task 9: Backend — registrar rutas citas y tratamientos en index.js

**Files:**
- Modificar: `backend/src/index.js`

- [ ] **Step 1: Agregar las rutas protegidas en index.js**

En `~/elys/backend/src/index.js`, después de la línea:
```js
app.use('/api/checadas', require('./routes/checadas'));
```
Agregar:
```js
app.use('/api/citas',         authMiddleware, require('./routes/citas'));
app.use('/api/tratamientos',  authMiddleware, require('./routes/tratamientos'));
```

El bloque de rutas protegidas completo queda:
```js
app.use('/api/empleados', authMiddleware, require('./routes/empleados'));
app.use('/api/documentos', authMiddleware, require('./routes/documentos'));
app.use('/api/contratos', authMiddleware, require('./routes/contratos'));
app.use('/api/pagos',     authMiddleware, require('./routes/pagos'));
app.use('/api/formatos',  authMiddleware, require('./routes/formatos'));
app.use('/api/checadas', require('./routes/checadas'));
app.use('/api/citas',         authMiddleware, require('./routes/citas'));
app.use('/api/tratamientos',  authMiddleware, require('./routes/tratamientos'));
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: registrar rutas citas y tratamientos en index.js"
```

---

## Task 10: Frontend — api/citas.js y api/tratamientos.js

**Files:**
- Crear: `frontend/src/api/citas.js`
- Crear: `frontend/src/api/tratamientos.js`

- [ ] **Step 1: Crear api/citas.js**

```js
// ~/elys/frontend/src/api/citas.js
import api from './client';

export const getCitas = ({ fecha, desde, hasta }) => {
  const params = {};
  if (fecha) params.fecha = fecha;
  else if (desde && hasta) { params.desde = desde; params.hasta = hasta; }
  return api.get('/citas', { params }).then(r => r.data);
};

export const createCita = (data) => api.post('/citas', data).then(r => r.data);
export const updateCita = (id, data) => api.put(`/citas/${id}`, data).then(r => r.data);
export const deleteCita = (id) => api.delete(`/citas/${id}`).then(r => r.data);
```

- [ ] **Step 2: Crear api/tratamientos.js**

```js
// ~/elys/frontend/src/api/tratamientos.js
import api from './client';

export const getTratamientos = () => api.get('/tratamientos').then(r => r.data);
export const getTratamientosActivos = () => api.get('/tratamientos/activos').then(r => r.data);
export const createTratamiento = (data) => api.post('/tratamientos', data).then(r => r.data);
export const updateTratamiento = (id, data) => api.put(`/tratamientos/${id}`, data).then(r => r.data);
```

- [ ] **Step 3: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: api helpers citas y tratamientos"
```

---

## Task 11: Frontend — CitaModal.jsx

**Files:**
- Crear: `frontend/src/components/CitaModal.jsx`

- [ ] **Step 1: Crear CitaModal.jsx**

```jsx
// ~/elys/frontend/src/components/CitaModal.jsx
import { useState, useEffect } from 'react';
import { getTratamientosActivos } from '../api/tratamientos';
import { createCita, updateCita, deleteCita } from '../api/citas';

const ESTATUSES = ['pendiente', 'realizada', 'cancelada'];

export default function CitaModal({ cita, fechaHoraInicial, onClose, onSaved }) {
  const rol = localStorage.getItem('rol');
  const esNueva = !cita?.id;

  const [form, setForm] = useState({
    nombre_paciente: cita?.nombre_paciente || '',
    telefono: cita?.telefono || '',
    tratamiento_id: cita?.tratamiento_id || '',
    empleada_id: cita?.empleada_id || '',
    fecha_hora: cita?.fecha_hora
      ? new Date(cita.fecha_hora).toISOString().slice(0, 16)
      : (fechaHoraInicial || ''),
    notas: cita?.notas || '',
    estatus: cita?.estatus || 'pendiente',
  });
  const [tratamientos, setTratamientos] = useState([]);
  const [empleadas, setEmpleadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTratamientosActivos().then(setTratamientos).catch(console.error);
    import('../api/empleados').then(m =>
      m.getEmpleados().then(data => setEmpleadas(data.filter(e => e.estatus === 'activo')))
    ).catch(console.error);
  }, []);

  const puedeEliminar = rol === 'admin' || cita?.estatus !== 'realizada';
  const puedeEditar = esNueva || rol === 'admin' || cita?.estatus !== 'realizada';

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!puedeEditar) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        tratamiento_id: form.tratamiento_id || null,
        empleada_id: form.empleada_id || null,
      };
      if (esNueva) {
        await createCita(payload);
      } else {
        await updateCita(cita.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta cita?')) return;
    setLoading(true);
    try {
      await deleteCita(cita.id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--color-dark)' }}>
            {esNueva ? 'Nueva cita' : 'Editar cita'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {!puedeEditar && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
            Esta cita ya fue realizada y no puede editarse.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Paciente *</label>
            <input
              type="text" required disabled={!puedeEditar}
              value={form.nombre_paciente}
              onChange={e => set('nombre_paciente', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              type="text" disabled={!puedeEditar}
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tratamiento</label>
            <select
              value={form.tratamiento_id} disabled={!puedeEditar}
              onChange={e => set('tratamiento_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            >
              <option value="">— Seleccionar —</option>
              {tratamientos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.duracion_min} min)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha y hora *</label>
            <input
              type="datetime-local" required disabled={!puedeEditar}
              value={form.fecha_hora}
              onChange={e => set('fecha_hora', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quien atiende</label>
            <select
              value={form.empleada_id} disabled={!puedeEditar}
              onChange={e => set('empleada_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            >
              <option value="">— Seleccionar —</option>
              {empleadas.map(e => (
                <option key={e.id} value={e.id}>{e.nombre} {e.apellido_paterno}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estatus</label>
            <select
              value={form.estatus} disabled={!puedeEditar}
              onChange={e => set('estatus', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            >
              {ESTATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              rows={2} disabled={!puedeEditar}
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            {puedeEditar && (
              <button type="submit" disabled={loading}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando...' : (esNueva ? 'Crear cita' : 'Guardar cambios')}
              </button>
            )}
            {!esNueva && puedeEliminar && (
              <button type="button" onClick={handleDelete} disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                Eliminar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que `api/empleados.js` exporta `getEmpleados`**

```bash
grep -n "getEmpleados\|export" ~/elys/frontend/src/api/empleados.js | head -10
```

Si no existe `getEmpleados`, verificar el nombre correcto de la función de listado y actualizar el import dinámico en CitaModal.jsx en consecuencia. En RHATA la función en `api/empleados.js` se llama según lo que exporta — ajustar si es diferente.

- [ ] **Step 3: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: CitaModal con control de rol y CRUD completo"
```

---

## Task 12: Frontend — CalendarioDia.jsx

**Files:**
- Crear: `frontend/src/components/CalendarioDia.jsx`

- [ ] **Step 1: Crear CalendarioDia.jsx**

```jsx
// ~/elys/frontend/src/components/CalendarioDia.jsx
import { useMemo } from 'react';

const HORA_INICIO = 8;
const HORA_FIN = 20;
const SLOT_H = 60; // px por hora
const TOTAL_H = (HORA_FIN - HORA_INICIO) * SLOT_H;
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => i + HORA_INICIO);

const COLORES = ['#cccad8','#aba3ba','#d4c5d0','#b8b0c8','#9a9070','#c8c0d8','#e0dce8','#887482'];

function colorTratamiento(id) {
  return COLORES[(id || 0) % COLORES.length];
}

function minutosDesdeInicio(fechaHora) {
  const d = new Date(fechaHora);
  return (d.getHours() - HORA_INICIO) * 60 + d.getMinutes();
}

function formatHora(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function CalendarioDia({ citas, empleadas, fecha, onSlotClick, onCitaClick }) {
  const cols = useMemo(() => {
    if (!empleadas.length) return [{ id: null, nombre: 'Sin asignar' }];
    return empleadas;
  }, [empleadas]);

  function handleSlotClick(empleadaId, hora) {
    const d = new Date(fecha);
    d.setHours(hora, 0, 0, 0);
    onSlotClick?.({ empleada_id: empleadaId, fecha_hora: d.toISOString().slice(0, 16) });
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${cols.length}, minmax(140px, 1fr))` }}>
        {/* Header */}
        <div className="h-8" />
        {cols.map(emp => (
          <div key={emp.id ?? 'none'} className="h-8 px-2 flex items-center justify-center text-xs font-semibold truncate border-l"
               style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-dark)', borderColor: 'var(--color-accent)' }}>
            {emp.nombre} {emp.apellido_paterno || ''}
          </div>
        ))}

        {/* Time axis */}
        <div style={{ position: 'relative', height: TOTAL_H }}>
          {HORAS.map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H,
                                   width: '100%', borderTop: '1px solid #e5e7eb' }}
                 className="flex items-start pt-1 justify-end pr-2">
              <span className="text-xs text-gray-400">{formatHora(h)}</span>
            </div>
          ))}
        </div>

        {/* Columnas por empleada */}
        {cols.map(emp => {
          const citasEmp = citas.filter(c =>
            (emp.id === null ? !c.empleada_id : c.empleada_id === emp.id)
          );
          return (
            <div key={emp.id ?? 'none'}
                 style={{ position: 'relative', height: TOTAL_H, borderLeft: '1px solid #e5e7eb' }}>
              {/* Fondos de hora clickeables */}
              {HORAS.slice(0, -1).map(h => (
                <div key={h}
                     onClick={() => handleSlotClick(emp.id, h)}
                     style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H,
                              width: '100%', borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
                     className="hover:bg-purple-50 transition-colors" />
              ))}
              {/* Bloques de citas */}
              {citasEmp.map(cita => {
                const top = minutosDesdeInicio(cita.fecha_hora);
                const height = Math.max(cita.duracion_min || 60, 30);
                if (top < 0 || top >= TOTAL_H) return null;
                return (
                  <div key={cita.id}
                       onClick={e => { e.stopPropagation(); onCitaClick?.(cita); }}
                       style={{
                         position: 'absolute', top, height, left: 4, right: 4,
                         backgroundColor: colorTratamiento(cita.tratamiento_id),
                         borderLeft: `3px solid var(--color-dark)`,
                         borderRadius: 6, padding: '2px 6px', cursor: 'pointer',
                         overflow: 'hidden', zIndex: 1,
                         opacity: cita.estatus === 'cancelada' ? 0.4 : 1,
                       }}>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-dark)' }}>
                      {cita.nombre_paciente}
                    </p>
                    {height >= 40 && (
                      <p className="text-xs truncate text-gray-600">{cita.tratamiento_nombre || '—'}</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: CalendarioDia con grid hora × empleada"
```

---

## Task 13: Frontend — CalendarioSemana.jsx

**Files:**
- Crear: `frontend/src/components/CalendarioSemana.jsx`

- [ ] **Step 1: Crear CalendarioSemana.jsx**

```jsx
// ~/elys/frontend/src/components/CalendarioSemana.jsx
import { useMemo } from 'react';

const HORA_INICIO = 8;
const HORA_FIN = 20;
const SLOT_H = 48;
const TOTAL_H = (HORA_FIN - HORA_INICIO) * SLOT_H;
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => i + HORA_INICIO);
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const COLORES = ['#cccad8','#aba3ba','#d4c5d0','#b8b0c8','#9a9070','#c8c0d8','#e0dce8','#887482'];
function colorTratamiento(id) { return COLORES[(id || 0) % COLORES.length]; }

function minutosDesdeInicio(fechaHora) {
  const d = new Date(fechaHora);
  return (d.getHours() - HORA_INICIO) * 60 + d.getMinutes();
}

function getLunesDeSemana(offset) {
  const hoy = new Date();
  const dia = hoy.getDay() || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - dia + 1 + offset * 7);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

export default function CalendarioSemana({ citas, weekOffset, onCitaClick, onSlotClick }) {
  const diasSemana = useMemo(() => {
    const lunes = getLunesDeSemana(weekOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  function citasDelDia(diaDate) {
    return citas.filter(c => {
      const f = new Date(c.fecha_hora);
      return f.toDateString() === diaDate.toDateString();
    });
  }

  function handleSlotClick(diaDate, hora) {
    const d = new Date(diaDate);
    d.setHours(hora, 0, 0, 0);
    onSlotClick?.({ fecha_hora: d.toISOString().slice(0, 16) });
  }

  const formatDia = (d) => `${DIAS[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()}`;
  const hoy = new Date().toDateString();

  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(7, minmax(100px, 1fr))` }}>
        {/* Header */}
        <div className="h-9" />
        {diasSemana.map((d, i) => (
          <div key={i}
               className="h-9 flex items-center justify-center text-xs font-semibold border-l"
               style={{
                 backgroundColor: d.toDateString() === hoy ? 'var(--color-accent)' : 'var(--color-primary)',
                 color: 'var(--color-dark)',
                 borderColor: 'var(--color-sage)',
               }}>
            {formatDia(d)}
          </div>
        ))}

        {/* Time axis */}
        <div style={{ position: 'relative', height: TOTAL_H }}>
          {HORAS.map(h => (
            <div key={h}
                 style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H,
                          width: '100%', borderTop: '1px solid #e5e7eb' }}
                 className="flex items-start justify-end pr-1 pt-0.5">
              <span className="text-xs text-gray-400">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {/* Columnas por día */}
        {diasSemana.map((diaDate, i) => {
          const citasDia = citasDelDia(diaDate);
          return (
            <div key={i}
                 style={{ position: 'relative', height: TOTAL_H, borderLeft: '1px solid #e5e7eb' }}>
              {HORAS.slice(0, -1).map(h => (
                <div key={h}
                     onClick={() => handleSlotClick(diaDate, h)}
                     style={{ position: 'absolute', top: (h - HORA_INICIO) * SLOT_H, height: SLOT_H,
                              width: '100%', borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
                     className="hover:bg-purple-50 transition-colors" />
              ))}
              {citasDia.map(cita => {
                const top = Math.round(minutosDesdeInicio(cita.fecha_hora) * SLOT_H / 60);
                const height = Math.max(Math.round((cita.duracion_min || 60) * SLOT_H / 60), 22);
                if (top < 0 || top >= TOTAL_H) return null;
                return (
                  <div key={cita.id}
                       onClick={e => { e.stopPropagation(); onCitaClick?.(cita); }}
                       style={{
                         position: 'absolute', top, height, left: 2, right: 2,
                         backgroundColor: colorTratamiento(cita.tratamiento_id),
                         borderLeft: `3px solid var(--color-dark)`,
                         borderRadius: 4, padding: '1px 4px', cursor: 'pointer',
                         overflow: 'hidden', zIndex: 1,
                         opacity: cita.estatus === 'cancelada' ? 0.4 : 1,
                       }}>
                    <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--color-dark)' }}>
                      {cita.nombre_paciente}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: CalendarioSemana con grid 7 días × hora"
```

---

## Task 14: Frontend — CitasPage.jsx

**Files:**
- Crear: `frontend/src/pages/CitasPage.jsx`

- [ ] **Step 1: Crear CitasPage.jsx**

```jsx
// ~/elys/frontend/src/pages/CitasPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { getCitas } from '../api/citas';
import CalendarioDia from '../components/CalendarioDia';
import CalendarioSemana from '../components/CalendarioSemana';
import CitaModal from '../components/CitaModal';

function fechaLocal(d) {
  return d.toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

function getLunesViernes(weekOffset) {
  const hoy = new Date();
  const dia = hoy.getDay() || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - dia + 1 + weekOffset * 7);
  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 6);
  return { desde: fechaLocal(lunes), hasta: fechaLocal(viernes) };
}

export default function CitasPage() {
  const [vista, setVista] = useState('semana'); // 'dia' | 'semana'
  const [fecha, setFecha] = useState(fechaLocal(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [citas, setCitas] = useState([]);
  const [empleadas, setEmpleadas] = useState([]);
  const [modal, setModal] = useState(null); // null | { cita } | { fechaHoraInicial }
  const [loading, setLoading] = useState(false);

  const cargarCitas = useCallback(async () => {
    setLoading(true);
    try {
      let params;
      if (vista === 'dia') {
        params = { fecha };
      } else {
        params = getLunesViernes(weekOffset);
      }
      const data = await getCitas(params);
      setCitas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vista, fecha, weekOffset]);

  useEffect(() => { cargarCitas(); }, [cargarCitas]);

  useEffect(() => {
    import('../api/empleados').then(m =>
      m.getEmpleados().then(data => setEmpleadas(data.filter(e => e.estatus === 'activo')))
    ).catch(console.error);
  }, []);

  function handleSaved() {
    setModal(null);
    cargarCitas();
  }

  const rangoLabel = () => {
    if (vista === 'dia') return fecha;
    const { desde, hasta } = getLunesViernes(weekOffset);
    return `${desde} — ${hasta}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>Control de Citas</h1>

        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-accent)' }}>
            {['dia', 'semana'].map(v => (
              <button key={v} onClick={() => setVista(v)}
                      className="px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: vista === v ? 'var(--color-accent)' : 'white',
                        color: vista === v ? 'white' : 'var(--color-dark)',
                      }}>
                {v === 'dia' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>

          {/* Navegación */}
          {vista === 'dia' ? (
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                   className="border rounded-lg px-3 py-1.5 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(w => w - 1)}
                      className="px-2 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>‹</button>
              <span className="text-sm px-2" style={{ color: 'var(--color-dark)' }}>{rangoLabel()}</span>
              <button onClick={() => setWeekOffset(w => w + 1)}
                      className="px-2 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>›</button>
              <button onClick={() => setWeekOffset(0)}
                      className="px-2 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>Hoy</button>
            </div>
          )}

          <button onClick={() => setModal({ fechaHoraInicial: `${fecha}T09:00` })}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
            + Nueva cita
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400 mb-2">Cargando...</p>}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
           style={{ borderColor: 'var(--color-sage)' }}>
        {vista === 'dia' ? (
          <CalendarioDia
            citas={citas}
            empleadas={empleadas}
            fecha={fecha}
            onSlotClick={({ empleada_id, fecha_hora }) => setModal({ fechaHoraInicial: fecha_hora, empleada_id })}
            onCitaClick={cita => setModal({ cita })}
          />
        ) : (
          <CalendarioSemana
            citas={citas}
            weekOffset={weekOffset}
            onSlotClick={({ fecha_hora }) => setModal({ fechaHoraInicial: fecha_hora })}
            onCitaClick={cita => setModal({ cita })}
          />
        )}
      </div>

      {modal && (
        <CitaModal
          cita={modal.cita}
          fechaHoraInicial={modal.fechaHoraInicial}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: CitasPage con vistas diaria y semanal"
```

---

## Task 15: Frontend — TratamientosPage.jsx

**Files:**
- Crear: `frontend/src/pages/TratamientosPage.jsx`

- [ ] **Step 1: Crear TratamientosPage.jsx**

```jsx
// ~/elys/frontend/src/pages/TratamientosPage.jsx
import { useState, useEffect } from 'react';
import { getTratamientos, createTratamiento, updateTratamiento } from '../api/tratamientos';

export default function TratamientosPage() {
  const rol = localStorage.getItem('rol');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nombre: '', duracion_min: 60 });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargar = () => getTratamientos().then(setItems).catch(console.error);
  useEffect(() => { cargar(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (editId) {
        await updateTratamiento(editId, form);
      } else {
        await createTratamiento(form);
      }
      setForm({ nombre: '', duracion_min: 60 });
      setEditId(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  function iniciarEditar(t) {
    setEditId(t.id);
    setForm({ nombre: t.nombre, duracion_min: t.duracion_min, activo: t.activo });
  }

  async function toggleActivo(t) {
    await updateTratamiento(t.id, { activo: !t.activo });
    cargar();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--color-dark)' }}>Catálogo de Tratamientos</h1>

      {rol === 'admin' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex gap-3 items-end"
              style={{ borderColor: 'var(--color-sage)' }}>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del tratamiento</label>
            <input type="text" required value={form.nombre}
                   onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-600 mb-1">Duración (min)</label>
            <input type="number" min="5" required value={form.duracion_min}
                   onChange={e => setForm(f => ({ ...f, duracion_min: parseInt(e.target.value) }))}
                   className="w-full border rounded-lg px-3 py-2 text-sm"
                   style={{ borderColor: 'var(--color-primary)' }} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
              {editId ? 'Actualizar' : 'Agregar'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ nombre: '', duracion_min: 60 }); }}
                      className="rounded-lg px-3 py-2 text-sm border"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: 'var(--color-sage)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-primary)' }}>
              <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--color-dark)' }}>Tratamiento</th>
              <th className="px-4 py-2 text-center font-semibold" style={{ color: 'var(--color-dark)' }}>Duración</th>
              <th className="px-4 py-2 text-center font-semibold" style={{ color: 'var(--color-dark)' }}>Estatus</th>
              {rol === 'admin' && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-t hover:bg-gray-50" style={{ borderColor: 'var(--color-sage)' }}>
                <td className="px-4 py-2">{t.nombre}</td>
                <td className="px-4 py-2 text-center text-gray-500">{t.duracion_min} min</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {rol === 'admin' && (
                  <td className="px-4 py-2 flex gap-2 justify-end">
                    <button onClick={() => iniciarEditar(t)}
                            className="text-xs px-2 py-1 rounded border"
                            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-dark)' }}>
                      Editar
                    </button>
                    <button onClick={() => toggleActivo(t)}
                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500">
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: TratamientosPage con catálogo admin"
```

---

## Task 16: Frontend — App.jsx branding y nuevas rutas

**Files:**
- Modificar: `frontend/src/App.jsx`

- [ ] **Step 1: Reemplazar App.jsx con branding Elys + nuevas rutas**

```jsx
// ~/elys/frontend/src/App.jsx
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import EmpleadosPage from './pages/EmpleadosPage';
import EmpleadoDetallePage from './pages/EmpleadoDetallePage';
import EmpleadoFormPage from './pages/EmpleadoFormPage';
import MapeoChecadorPage from './pages/MapeoChecadorPage';
import PagosPage from './pages/PagosPage';
import FormatosPage from './pages/FormatosPage';
import CitasPage from './pages/CitasPage';
import TratamientosPage from './pages/TratamientosPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

function NavItem({ to, end, children }) {
  return (
    <NavLink to={to} end={end}
             className={({ isActive }) =>
               `text-sm px-3 py-1 rounded-lg transition-colors ${
                 isActive
                   ? 'font-semibold'
                   : 'hover:opacity-75'
               }`
             }
             style={({ isActive }) => ({
               backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
               color: isActive ? 'white' : 'var(--color-dark)',
             })}>
      {children}
    </NavLink>
  );
}

function Layout() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem('nombre');
  const rol = localStorage.getItem('rol');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    navigate('/login');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <nav className="px-6 py-3 flex items-center gap-3 shadow-sm border-b"
           style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-sage)' }}>
        <div className="flex flex-col leading-tight mr-4">
          <span className="font-bold text-base tracking-wide" style={{ color: 'var(--color-dark)' }}>Elys</span>
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-dark)', opacity: 0.6 }}>
            Clínica de Belleza
          </span>
        </div>
        <div className="flex gap-1 flex-1 flex-wrap">
          <NavItem to="/citas">Citas</NavItem>
          <NavItem to="/" end>Empleados</NavItem>
          <NavItem to="/pagos">Pagos</NavItem>
          <NavItem to="/checador/mapeo">Checador</NavItem>
          <NavItem to="/formatos">Formatos</NavItem>
          {rol === 'admin' && <NavItem to="/tratamientos">Tratamientos</NavItem>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--color-dark)', opacity: 0.7 }}>
            {nombre} {rol === 'admin' ? '· Admin' : '· Asistente'}
          </span>
          <button onClick={logout}
                  className="text-xs border rounded px-2 py-1 transition-colors hover:opacity-75"
                  style={{ borderColor: 'var(--color-dark)', color: 'var(--color-dark)' }}>
            Salir
          </button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        <Routes>
          <Route path="/citas" element={<CitasPage />} />
          <Route path="/" element={<EmpleadosPage />} />
          <Route path="/empleados/nuevo" element={<EmpleadoFormPage />} />
          <Route path="/empleados/:id" element={<EmpleadoDetallePage />} />
          <Route path="/empleados/:id/editar" element={<EmpleadoFormPage />} />
          <Route path="/pagos" element={<PagosPage />} />
          <Route path="/checador/mapeo" element={<MapeoChecadorPage />} />
          <Route path="/formatos" element={<FormatosPage />} />
          {rol === 'admin' && <Route path="/tratamientos" element={<TratamientosPage />} />}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys && git add -A && git commit -m "feat: App.jsx con branding Elys, nav Citas/Tratamientos y rol"
```

---

## Task 17: Levantar localmente y verificar

- [ ] **Step 1: Instalar dependencias backend**

```bash
cd ~/elys/backend && npm install
```

- [ ] **Step 2: Instalar dependencias frontend**

```bash
cd ~/elys/frontend && npm install
```

- [ ] **Step 3: Levantar PostgreSQL**

```bash
cd ~/elys && docker compose up -d
```

Verificar:
```bash
docker ps | grep elys
```
Expected: contenedor postgres corriendo en puerto 5439.

- [ ] **Step 4: Levantar backend (aplica migraciones automáticamente)**

```bash
cd ~/elys/backend && npm run dev
```

Expected en consola:
```
Migración aplicada: 007_rol_usuario.sql
Migración aplicada: 008_citas.sql
Migración aplicada: 009_seed_tratamientos.sql
Backend Elys corriendo en puerto 3008
```

- [ ] **Step 5: Crear usuario admin**

En otra terminal:
```bash
cd ~/elys/backend && npm run seed
```

Expected: `✓ Admin seeded: admin@elys.com / Admin123!`

- [ ] **Step 6: Levantar frontend**

```bash
cd ~/elys/frontend && npm run dev
```

Expected: Vite running on `http://localhost:5173`

- [ ] **Step 7: Verificar login**

Abrir `http://localhost:5173` en el navegador.
- Email: `admin@elys.com`
- Password: `Admin123!`
Expected: Redirige al dashboard con nav color lavanda, nombre "Elys".

- [ ] **Step 8: Verificar módulo Citas**

1. Click en "Citas" en la nav → debe mostrar el calendario semanal vacío.
2. Click en un hueco → debe abrirse CitaModal con fecha/hora prellenada.
3. Llenar nombre, seleccionar tratamiento (debe mostrar la lista seed), guardar.
4. La cita debe aparecer como bloque coloreado en el calendario.
5. Click en la cita → modal en modo editar.
6. Cambiar estatus a "realizada" → guardar → cita se vuelve más opaca.
7. Intentar editar la cita realizada → debe mostrar el aviso "no puede editarse".

- [ ] **Step 9: Verificar Tratamientos (admin)**

1. Click en "Tratamientos" en nav (solo visible para admin).
2. Debe mostrar la lista de 10 tratamientos del seed.
3. Agregar un nuevo tratamiento → debe aparecer en la lista.
4. Editar duración → debe actualizarse.

- [ ] **Step 10: Commit final**

```bash
cd ~/elys && git add -A && git commit -m "chore: verificación local completada — Elys funcional"
```

---

## Task 18: Actualizar registros de memoria

- [ ] **Step 1: Actualizar port_registry.md**

En `/home/alejandroayalag/.claude/projects/-home-alejandroayalag/memory/port_registry.md`, agregar fila a la tabla:

```
| elys | ~/elys/ | **3008** | 5439 | 8088 |
```

Y actualizar "Próximos disponibles":
```
- Backend: **3009**
- PostgreSQL: **5440**
- Nginx: **8089**
```

- [ ] **Step 2: Actualizar credentials.md**

En la tabla de proyectos de `/home/alejandroayalag/.claude/projects/-home-alejandroayalag/memory/credentials.md`, agregar:

```
| Elys | admin@elys.com | Admin123! | Dra. Giovanna Valencia |
```

- [ ] **Step 3: Crear memory project_elys.md**

Crear archivo de memoria en `/home/alejandroayalag/.claude/projects/-home-alejandroayalag/memory/project_elys.md` con los datos del proyecto.

- [ ] **Step 4: Commit**

```bash
cd ~/elys && git add -A && git commit -m "chore: proyecto Elys completo y verificado"
```

---

## Resumen de comandos de desarrollo

```bash
# Backend (dev)
cd ~/elys/backend && npm run dev

# Frontend (dev)
cd ~/elys/frontend && npm run dev

# DB
cd ~/elys && docker compose up -d

# Seed admin
cd ~/elys/backend && npm run seed

# Deploy a servidor
cd ~/elys && ./deploy.sh
```
