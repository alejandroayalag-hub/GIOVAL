# Fotos de Tratamiento + Laboratorios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar galería de fotos por etapa (antes/durante/después) inline en el tab Citas del expediente del paciente, y un nuevo tab Laboratorios para subir análisis como PDF o imagen.

**Architecture:** Dos módulos backend independientes (fotos-cita y laboratorios) con Multer + PostgreSQL, ambos integrados en PacienteDetallePage. Las fotos se cargan lazy al expandir cada cita. Los laboratorios son documentos generales del paciente.

**Tech Stack:** Node.js + Express + Multer + PostgreSQL (pool), React 19 + Vite, Tailwind v4, axios client compartido.

---

## Archivos a crear / modificar

### Nuevos
- `backend/src/db/migrations/026_fotos_cita.sql`
- `backend/src/db/migrations/027_laboratorios.sql`
- `backend/src/models/fotoCita.js`
- `backend/src/models/laboratorio.js`
- `backend/src/controllers/fotosCitaController.js`
- `backend/src/controllers/laboratoriosController.js`
- `backend/src/routes/fotos-cita.js`
- `backend/src/routes/laboratorios.js`
- `frontend/src/api/fotosCita.js`
- `frontend/src/api/laboratorios.js`
- `frontend/src/components/LaboratorioModal.jsx`

### Modificados
- `backend/src/index.js` — registrar 2 rutas nuevas
- `frontend/src/pages/PacienteDetallePage.jsx` — fotos inline en tab Citas + tab Laboratorios

---

## Task 1: Migraciones de base de datos

**Files:**
- Create: `backend/src/db/migrations/026_fotos_cita.sql`
- Create: `backend/src/db/migrations/027_laboratorios.sql`

- [ ] **Paso 1: Crear migración 026**

```sql
-- backend/src/db/migrations/026_fotos_cita.sql
CREATE TABLE fotos_cita (
  id          SERIAL PRIMARY KEY,
  cita_id     INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  etapa       VARCHAR(10) NOT NULL CHECK (etapa IN ('antes','durante','despues')),
  archivo     TEXT NOT NULL,
  descripcion TEXT,
  creado_por  INTEGER REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fotos_cita_cita_id ON fotos_cita(cita_id);
```

- [ ] **Paso 2: Crear migración 027**

```sql
-- backend/src/db/migrations/027_laboratorios.sql
CREATE TABLE laboratorios (
  id          SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  archivo     TEXT NOT NULL,
  fecha       DATE,
  notas       TEXT,
  creado_por  INTEGER REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_laboratorios_paciente_id ON laboratorios(paciente_id);
```

- [ ] **Paso 3: Aplicar migraciones localmente**

```bash
cd ~/elys && docker compose up -d
cd ~/elys/backend && npm run dev
# El runner de migraciones las aplica automáticamente al arrancar
# Verificar en logs: "Migración aplicada: 026_fotos_cita.sql" y "027_laboratorios.sql"
```

- [ ] **Paso 4: Commit**

```bash
cd ~/elys
git add backend/src/db/migrations/026_fotos_cita.sql backend/src/db/migrations/027_laboratorios.sql
git commit -m "feat: migrations 026 fotos_cita y 027 laboratorios"
```

---

## Task 2: Modelo + controlador + ruta — fotos_cita

**Files:**
- Create: `backend/src/models/fotoCita.js`
- Create: `backend/src/controllers/fotosCitaController.js`
- Create: `backend/src/routes/fotos-cita.js`

- [ ] **Paso 1: Crear model `fotoCita.js`**

```js
// backend/src/models/fotoCita.js
const pool = require('../db/pool');

const FotoCita = {
  async findByCita(citaId) {
    const { rows } = await pool.query(
      `SELECT fc.*, u.nombre as creado_por_nombre
       FROM fotos_cita fc
       LEFT JOIN usuarios u ON u.id = fc.creado_por
       WHERE fc.cita_id = $1
       ORDER BY fc.etapa, fc.created_at`,
      [citaId]
    );
    // Agrupar por etapa
    const grouped = { antes: [], durante: [], despues: [] };
    for (const row of rows) grouped[row.etapa].push(row);
    return grouped;
  },

  async create({ cita_id, paciente_id, etapa, archivo, descripcion, creado_por }) {
    const { rows } = await pool.query(
      `INSERT INTO fotos_cita (cita_id, paciente_id, etapa, archivo, descripcion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [cita_id, paciente_id, etapa, archivo, descripcion || null, creado_por || null]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM fotos_cita WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0];
  },
};

module.exports = FotoCita;
```

- [ ] **Paso 2: Crear controller `fotosCitaController.js`**

```js
// backend/src/controllers/fotosCitaController.js
const FotoCita = require('../models/fotoCita');

module.exports = {
  async getByCita(req, res) {
    try {
      const { cita_id } = req.query;
      if (!cita_id) return res.status(400).json({ error: 'cita_id requerido' });
      const fotos = await FotoCita.findByCita(cita_id);
      res.json(fotos);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async create(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
      const { cita_id, paciente_id, etapa, descripcion } = req.body;
      if (!cita_id || !paciente_id || !etapa) {
        return res.status(400).json({ error: 'cita_id, paciente_id y etapa son requeridos' });
      }
      const archivo = `uploads/fotos-cita/${req.file.filename}`;
      const foto = await FotoCita.create({
        cita_id, paciente_id, etapa, archivo,
        descripcion, creado_por: req.user?.id,
      });
      res.status(201).json(foto);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async remove(req, res) {
    try {
      const foto = await FotoCita.delete(req.params.id);
      if (!foto) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};
```

- [ ] **Paso 3: Crear ruta `fotos-cita.js` con Multer propio**

```js
// backend/src/routes/fotos-cita.js
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireRol } = require('../middleware/roles');
const ctrl = require('../controllers/fotosCitaController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'fotos-cita');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/',    requireRol('admin', 'asistente_medico'), ctrl.getByCita);
router.post('/',   requireRol('admin', 'asistente_medico'), upload.single('archivo'), ctrl.create);
router.delete('/:id', requireRol('admin'), ctrl.remove);

module.exports = router;
```

- [ ] **Paso 4: Commit**

```bash
cd ~/elys
git add backend/src/models/fotoCita.js backend/src/controllers/fotosCitaController.js backend/src/routes/fotos-cita.js
git commit -m "feat: backend fotos_cita model + controller + route"
```

---

## Task 3: Modelo + controlador + ruta — laboratorios

**Files:**
- Create: `backend/src/models/laboratorio.js`
- Create: `backend/src/controllers/laboratoriosController.js`
- Create: `backend/src/routes/laboratorios.js`

- [ ] **Paso 1: Crear model `laboratorio.js`**

```js
// backend/src/models/laboratorio.js
const pool = require('../db/pool');

const Laboratorio = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT l.*, u.nombre as creado_por_nombre
       FROM laboratorios l
       LEFT JOIN usuarios u ON u.id = l.creado_por
       WHERE l.paciente_id = $1
       ORDER BY l.created_at DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create({ paciente_id, nombre, archivo, fecha, notas, creado_por }) {
    const { rows } = await pool.query(
      `INSERT INTO laboratorios (paciente_id, nombre, archivo, fecha, notas, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [paciente_id, nombre, archivo, fecha || null, notas || null, creado_por || null]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM laboratorios WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0];
  },
};

module.exports = Laboratorio;
```

- [ ] **Paso 2: Crear controller `laboratoriosController.js`**

```js
// backend/src/controllers/laboratoriosController.js
const Laboratorio = require('../models/laboratorio');

module.exports = {
  async getByPaciente(req, res) {
    try {
      const { paciente_id } = req.query;
      if (!paciente_id) return res.status(400).json({ error: 'paciente_id requerido' });
      const labs = await Laboratorio.findByPaciente(paciente_id);
      res.json(labs);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async create(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
      const { paciente_id, nombre, fecha, notas } = req.body;
      if (!paciente_id || !nombre) {
        return res.status(400).json({ error: 'paciente_id y nombre son requeridos' });
      }
      const archivo = `uploads/laboratorios/${req.file.filename}`;
      const lab = await Laboratorio.create({
        paciente_id, nombre, archivo, fecha, notas,
        creado_por: req.user?.id,
      });
      res.status(201).json(lab);
    } catch (e) { res.status(500).json({ error: e.message }); }
  },

  async remove(req, res) {
    try {
      const lab = await Laboratorio.delete(req.params.id);
      if (!lab) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  },
};
```

- [ ] **Paso 3: Crear ruta `laboratorios.js` con Multer propio**

```js
// backend/src/routes/laboratorios.js
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireRol } = require('../middleware/roles');
const ctrl = require('../controllers/laboratoriosController');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'laboratorios');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Solo PDF e imágenes (JPG, PNG)'));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.get('/',       requireRol('admin', 'asistente_medico'), ctrl.getByPaciente);
router.post('/',      requireRol('admin', 'asistente_medico'), upload.single('archivo'), ctrl.create);
router.delete('/:id', requireRol('admin'), ctrl.remove);

module.exports = router;
```

- [ ] **Paso 4: Commit**

```bash
cd ~/elys
git add backend/src/models/laboratorio.js backend/src/controllers/laboratoriosController.js backend/src/routes/laboratorios.js
git commit -m "feat: backend laboratorios model + controller + route"
```

---

## Task 4: Registrar rutas en index.js

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Paso 1: Agregar las dos rutas después de `/api/documentos-clinicos`**

En `backend/src/index.js`, localizar la línea:
```js
app.use('/api/documentos-clinicos',  authMiddleware, require('./routes/documentos-clinicos'));
```

Agregar inmediatamente después:
```js
app.use('/api/fotos-cita',    authMiddleware, require('./routes/fotos-cita'));
app.use('/api/laboratorios',  authMiddleware, require('./routes/laboratorios'));
```

- [ ] **Paso 2: Reiniciar backend y verificar rutas disponibles**

```bash
# Con el backend corriendo, verificar health:
curl http://localhost:3008/api/health
# Esperado: {"ok":true}
# Si hay error de startup, revisar logs de npm run dev
```

- [ ] **Paso 3: Commit**

```bash
cd ~/elys
git add backend/src/index.js
git commit -m "feat: registrar rutas fotos-cita y laboratorios en index"
```

---

## Task 5: API helpers frontend

**Files:**
- Create: `frontend/src/api/fotosCita.js`
- Create: `frontend/src/api/laboratorios.js`

- [ ] **Paso 1: Crear `fotosCita.js`**

```js
// frontend/src/api/fotosCita.js
import api from './client';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3008';

export const getFotosByCita = (cita_id) =>
  api.get(`/fotos-cita?cita_id=${cita_id}`).then(r => r.data);

export const uploadFotoCita = (formData) =>
  api.post('/fotos-cita', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const deleteFotoCita = (id) =>
  api.delete(`/fotos-cita/${id}`).then(r => r.data);

export const fotoUrl = (archivo) => `${BASE_URL}/${archivo}`;
```

- [ ] **Paso 2: Crear `laboratorios.js`**

```js
// frontend/src/api/laboratorios.js
import api from './client';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3008';

export const getLaboratoriosByPaciente = (paciente_id) =>
  api.get(`/laboratorios?paciente_id=${paciente_id}`).then(r => r.data);

export const uploadLaboratorio = (formData) =>
  api.post('/laboratorios', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const deleteLaboratorio = (id) =>
  api.delete(`/laboratorios/${id}`).then(r => r.data);

export const archivoUrl = (archivo) => `${BASE_URL}/${archivo}`;
```

- [ ] **Paso 3: Commit**

```bash
cd ~/elys
git add frontend/src/api/fotosCita.js frontend/src/api/laboratorios.js
git commit -m "feat: api helpers frontend fotosCita y laboratorios"
```

---

## Task 6: Componente LaboratorioModal

**Files:**
- Create: `frontend/src/components/LaboratorioModal.jsx`

- [ ] **Paso 1: Crear el modal**

```jsx
// frontend/src/components/LaboratorioModal.jsx
import { useState } from 'react';
import { uploadLaboratorio } from '../api/laboratorios';

export default function LaboratorioModal({ pacienteId, onSaved, onClose }) {
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [notas, setNotas] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es requerido');
    if (!archivo) return setError('Selecciona un archivo');
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('paciente_id', pacienteId);
      fd.append('nombre', nombre.trim());
      if (fecha) fd.append('fecha', fecha);
      if (notas.trim()) fd.append('notas', notas.trim());
      fd.append('archivo', archivo);
      const lab = await uploadLaboratorio(fd);
      onSaved(lab);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir archivo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
           style={{ borderColor: 'var(--color-sage)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-dark)' }}>
            Subir análisis de laboratorio
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Biometría hemática jun-2026"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Fecha del análisis
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-sage)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Notas
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones opcionales…"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              style={{ borderColor: 'var(--color-sage)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-dark)' }}>
              Archivo <span className="text-red-400">*</span>
              <span className="text-xs text-gray-400 ml-1">(PDF, JPG, PNG — máx 20MB)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setArchivo(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            {archivo && (
              <p className="text-xs text-gray-500 mt-1">{archivo.name}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
              {saving ? 'Subiendo…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
cd ~/elys
git add frontend/src/components/LaboratorioModal.jsx
git commit -m "feat: componente LaboratorioModal"
```

---

## Task 7: PacienteDetallePage — fotos inline en tab Citas

**Files:**
- Modify: `frontend/src/pages/PacienteDetallePage.jsx`

Esta tarea modifica PacienteDetallePage en dos partes. Esta parte agrega las fotos inline en el tab de Citas.

- [ ] **Paso 1: Agregar imports de fotos al inicio del archivo**

Localizar la sección de imports en `frontend/src/pages/PacienteDetallePage.jsx` y agregar:

```js
import { getFotosByCita, uploadFotoCita, deleteFotoCita, fotoUrl } from '../api/fotosCita';
```

- [ ] **Paso 2: Agregar estado de fotos en el componente**

Dentro de `PacienteDetallePage`, después de la línea `const [consentModal, setConsentModal] = useState(null);`, agregar:

```js
const [citaFotosOpen, setCitaFotosOpen] = useState({});
const [fotosByCita, setFotosByCita] = useState({});
const [lightbox, setLightbox] = useState(null);
```

- [ ] **Paso 3: Agregar función para cargar fotos de una cita**

Después del bloque de estado nuevo, agregar:

```js
async function cargarFotosCita(citaId) {
  if (fotosByCita[citaId]) return; // ya cargadas
  try {
    const data = await getFotosByCita(citaId);
    setFotosByCita(prev => ({ ...prev, [citaId]: data }));
  } catch (e) {
    console.error('Error cargando fotos cita', e);
  }
}

function toggleFotosCita(citaId) {
  const abriendo = !citaFotosOpen[citaId];
  setCitaFotosOpen(prev => ({ ...prev, [citaId]: abriendo }));
  if (abriendo) cargarFotosCita(citaId);
}

async function handleUploadFoto(citaId, etapa, file) {
  try {
    const fd = new FormData();
    fd.append('cita_id', citaId);
    fd.append('paciente_id', id);
    fd.append('etapa', etapa);
    fd.append('archivo', file);
    const nueva = await uploadFotoCita(fd);
    setFotosByCita(prev => {
      const grupo = prev[citaId] || { antes: [], durante: [], despues: [] };
      return {
        ...prev,
        [citaId]: { ...grupo, [etapa]: [...(grupo[etapa] || []), nueva] },
      };
    });
  } catch (e) {
    alert(e.response?.data?.error || 'Error al subir foto');
  }
}

async function handleDeleteFoto(citaId, etapa, fotoId) {
  if (!confirm('¿Eliminar esta foto?')) return;
  try {
    await deleteFotoCita(fotoId);
    setFotosByCita(prev => {
      const grupo = prev[citaId] || { antes: [], durante: [], despues: [] };
      return {
        ...prev,
        [citaId]: { ...grupo, [etapa]: grupo[etapa].filter(f => f.id !== fotoId) },
      };
    });
  } catch (e) {
    alert('Error al eliminar foto');
  }
}
```

- [ ] **Paso 4: Modificar la tabla de citas para agregar el acordeón de fotos**

Localizar en el JSX la sección del tab Citas. La tabla tiene `<thead>` con columnas `['Fecha y hora','Tratamiento','Empleada','Estatus']`. Cambiar a 5 columnas agregando acciones, y agregar el acordeón.

Reemplazar el contenido completo del `<table>` dentro del tab Citas:

```jsx
<table className="w-full text-sm">
  <thead>
    <tr style={{ backgroundColor: 'var(--color-primary)' }}>
      {['Fecha y hora','Tratamiento','Empleada','Estatus', ...(rol === 'admin' || rol === 'asistente_medico' ? ['Fotos'] : [])].map(col => (
        <th key={col} className="text-left px-4 py-3 text-xs font-semibold"
            style={{ color: 'var(--color-dark)' }}>{col}</th>
      ))}
    </tr>
  </thead>
  <tbody>
    {paciente.citas.map(c => {
      const fotosAbiertas = citaFotosOpen[c.id];
      const fotosData = fotosByCita[c.id];
      const totalFotos = fotosData
        ? (fotosData.antes.length + fotosData.durante.length + fotosData.despues.length)
        : 0;
      return (
        <React.Fragment key={c.id}>
          <tr className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
            <td className="px-4 py-3">
              {new Date(c.fecha_hora).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
            </td>
            <td className="px-4 py-3">{c.tratamiento_nombre || '—'}</td>
            <td className="px-4 py-3">{c.empleada_nombre || '—'}</td>
            <td className="px-4 py-3">
              <span className="px-2 py-1 rounded-full text-xs text-white"
                    style={{ backgroundColor: ESTATUS_COLOR[c.estatus] || '#ccc' }}>
                {c.estatus}
              </span>
            </td>
            {(rol === 'admin' || rol === 'asistente_medico') && (
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleFotosCita(c.id)}
                  className="text-xs px-2 py-1 rounded border transition-colors"
                  style={{
                    borderColor: 'var(--color-accent)',
                    color: fotosAbiertas ? 'white' : 'var(--color-accent)',
                    backgroundColor: fotosAbiertas ? 'var(--color-accent)' : 'transparent',
                  }}
                >
                  📷 {totalFotos > 0 ? `Fotos (${totalFotos})` : 'Fotos'}
                </button>
              </td>
            )}
          </tr>
          {fotosAbiertas && (rol === 'admin' || rol === 'asistente_medico') && (
            <tr className="border-t" style={{ borderColor: 'var(--color-sage)', backgroundColor: '#faf9fb' }}>
              <td colSpan={5} className="px-4 py-4">
                {!fotosData ? (
                  <p className="text-xs text-gray-400">Cargando fotos…</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {['antes', 'durante', 'despues'].map(etapa => (
                      <div key={etapa}>
                        <p className="text-xs font-semibold mb-2 capitalize"
                           style={{ color: 'var(--color-accent)' }}>
                          {etapa === 'despues' ? 'Después' : etapa.charAt(0).toUpperCase() + etapa.slice(1)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(fotosData[etapa] || []).map(foto => (
                            <div key={foto.id} className="relative group w-16 h-16 rounded overflow-hidden border"
                                 style={{ borderColor: 'var(--color-sage)' }}>
                              <img
                                src={fotoUrl(foto.archivo)}
                                alt={etapa}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setLightbox(fotoUrl(foto.archivo))}
                              />
                              {rol === 'admin' && (
                                <button
                                  onClick={() => handleDeleteFoto(c.id, etapa, foto.id)}
                                  className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <label className="w-16 h-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:opacity-70"
                                 style={{ borderColor: 'var(--color-accent)' }}>
                            <span className="text-xl" style={{ color: 'var(--color-accent)' }}>+</span>
                            <input type="file" accept="image/*" className="hidden"
                                   onChange={e => {
                                     const file = e.target.files?.[0];
                                     if (file) handleUploadFoto(c.id, etapa, file);
                                     e.target.value = '';
                                   }} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    })}
  </tbody>
</table>
```

**Nota:** Asegúrate de tener `import React from 'react';` o usar `import { useState, useEffect, Fragment } from 'react';` y reemplazar `React.Fragment` por `Fragment` si prefieres el import nombrado.

- [ ] **Paso 5: Agregar lightbox al final del JSX (antes del último `</div>` del return)**

Dentro del `return` de `PacienteDetallePage`, antes del último `</div>` cierre del componente, agregar:

```jsx
{lightbox && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
       onClick={() => setLightbox(null)}>
    <img src={lightbox} alt="foto ampliada"
         className="max-w-full max-h-full rounded-lg shadow-2xl"
         onClick={e => e.stopPropagation()} />
    <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl bg-black/50 rounded-full w-8 h-8 flex items-center justify-center">
      ×
    </button>
  </div>
)}
```

- [ ] **Paso 6: Commit**

```bash
cd ~/elys
git add frontend/src/pages/PacienteDetallePage.jsx
git commit -m "feat: fotos de tratamiento inline en tab citas"
```

---

## Task 8: PacienteDetallePage — tab Laboratorios

**Files:**
- Modify: `frontend/src/pages/PacienteDetallePage.jsx`

- [ ] **Paso 1: Agregar imports de laboratorios**

En la sección de imports de `PacienteDetallePage.jsx`, agregar:

```js
import { getLaboratoriosByPaciente, deleteLaboratorio, archivoUrl } from '../api/laboratorios';
import LaboratorioModal from '../components/LaboratorioModal';
```

- [ ] **Paso 2: Agregar estado de laboratorios**

Después del estado de lightbox, agregar:

```js
const [laboratorios, setLaboratorios] = useState([]);
const [labModal, setLabModal] = useState(false);
```

- [ ] **Paso 3: Cargar laboratorios en la función `cargar`**

En la función `cargar(soloMeta = false)`, en el bloque `else` (carga completa), agregar laboratorios al `Promise.all`:

```js
// Reemplazar:
const [p, h, n, cf] = await Promise.all([
  getPaciente(id),
  getHistoria(id),
  getNotasByPaciente(id),
  getFirmadosByPaciente(id),
]);
setPaciente(p); setHistoria(h); setNotas(n); setConsentsFirmados(cf);

// Por:
const [p, h, n, cf, labs] = await Promise.all([
  getPaciente(id),
  getHistoria(id),
  getNotasByPaciente(id),
  getFirmadosByPaciente(id),
  getLaboratoriosByPaciente(id),
]);
setPaciente(p); setHistoria(h); setNotas(n); setConsentsFirmados(cf); setLaboratorios(labs);
```

- [ ] **Paso 4: Agregar tab "Laboratorios" en el tab bar**

Localizar el bloque de tabs que termina con:
```jsx
{(rol === 'admin' || rol === 'asistente_medico') && (
  <TabBtn active={tab === 'documentos'} onClick={() => setTab('documentos')}>
    Valoraciones y Procedimientos
  </TabBtn>
)}
```

Agregar inmediatamente después:
```jsx
{(rol === 'admin' || rol === 'asistente_medico') && (
  <TabBtn active={tab === 'laboratorios'} onClick={() => setTab('laboratorios')}>
    Laboratorios {laboratorios.length ? `(${laboratorios.length})` : ''}
  </TabBtn>
)}
```

- [ ] **Paso 5: Agregar el contenido del tab Laboratorios**

Localizar el bloque del tab `documentos` (último tab antes de los modales) y agregar después:

```jsx
{tab === 'laboratorios' && (rol === 'admin' || rol === 'asistente_medico') && (
  <div>
    <div className="flex justify-end mb-4">
      <button
        onClick={() => setLabModal(true)}
        className="text-sm px-4 py-2 rounded-lg text-white"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        + Subir análisis
      </button>
    </div>

    {laboratorios.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-8">
        Sin análisis de laboratorio registrados.
      </p>
    ) : (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
           style={{ borderColor: 'var(--color-sage)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-primary)' }}>
              {['Nombre', 'Fecha', 'Notas', 'Acciones'].map(col => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold"
                    style={{ color: 'var(--color-dark)' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laboratorios.map(lab => (
              <tr key={lab.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                <td className="px-4 py-3 font-medium">{lab.nombre}</td>
                <td className="px-4 py-3 text-gray-500">
                  {lab.fecha
                    ? new Date(lab.fecha + 'T00:00:00').toLocaleDateString('es-MX', { dateStyle: 'short' })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{lab.notas || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(archivoUrl(lab.archivo), '_blank')}
                      className="text-xs px-2 py-1 rounded border"
                      style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                    >
                      Ver
                    </button>
                    {rol === 'admin' && (
                      <button
                        onClick={async () => {
                          if (!confirm('¿Eliminar este análisis?')) return;
                          try {
                            await deleteLaboratorio(lab.id);
                            setLaboratorios(prev => prev.filter(l => l.id !== lab.id));
                          } catch { alert('Error al eliminar'); }
                        }}
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-500"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {labModal && (
      <LaboratorioModal
        pacienteId={id}
        onSaved={lab => setLaboratorios(prev => [lab, ...prev])}
        onClose={() => setLabModal(false)}
      />
    )}
  </div>
)}
```

- [ ] **Paso 6: Commit**

```bash
cd ~/elys
git add frontend/src/pages/PacienteDetallePage.jsx
git commit -m "feat: tab laboratorios en expediente paciente"
```

---

## Task 9: Build y deploy

**Files:**
- N/A (operaciones de build y deploy)

- [ ] **Paso 1: Verificar que el frontend compila sin errores**

```bash
cd ~/elys/frontend && npm run build
# Esperado: "built in X.Xs" sin errores. Si hay errores TypeScript/JSX, corregir antes de continuar.
```

- [ ] **Paso 2: Prueba rápida en local**

```bash
# Con backend corriendo (npm run dev en ~/elys/backend):
cd ~/elys/frontend && npm run dev
# Abrir http://localhost:5173, entrar como admin@elys.com / Admin123!
# 1. Ir a un paciente → tab Citas → click "📷 Fotos" en una cita → verificar acordeón
# 2. Subir una foto en etapa "antes" → verificar thumbnail aparece
# 3. Click thumbnail → verificar lightbox
# 4. Ir a tab "Laboratorios" → verificar que aparece
# 5. Click "Subir análisis" → llenar form → guardar → verificar aparece en tabla
# 6. Click "Ver" → verifica que abre en nueva pestaña
```

- [ ] **Paso 3: Deploy a producción**

```bash
cd ~/elys
./deploy.sh
# El script rebuilda el frontend y sincroniza backend + dist/ al servidor
```

- [ ] **Paso 4: Verificar en producción**

```
Abrir http://62.238.3.136:8088 → login → expediente de paciente → tab Citas → Fotos
Abrir http://62.238.3.136:8088 → login → expediente de paciente → tab Laboratorios
```
