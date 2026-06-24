# Procedimientos en Vivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Módulo "Procedimientos en vivo" que trackea el flujo operativo de cada paciente (check-in → consultorio → procedimiento → cierre SOAP → caja → completado) en tiempo real con roles y bloqueos.

**Architecture:** Nueva tabla `flujo_paciente` como capa de estado sobre `citas`. Backend con controller + routes propios para flujo y consultorios. Frontend: página `ProcedimientosPage` con `TarjetaPaciente` por cita, auto-refresh 30s, reutiliza `NotaVisitaModal` existente para la SOAP.

**Tech Stack:** Node.js + Express 5, PostgreSQL 16, React 19 + Vite 8, Tailwind CSS v4. Pool: `require('../db/pool')`. Deploy: `./deploy.sh` desde `~/elys/`.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear | `backend/src/db/migrations/021_procedimientos_en_vivo.sql` |
| Crear | `backend/src/controllers/consultoriosController.js` |
| Crear | `backend/src/routes/consultorios.js` |
| Crear | `backend/src/controllers/flujoController.js` |
| Crear | `backend/src/routes/flujo.js` |
| Modificar | `backend/src/index.js` — registrar `/api/consultorios` y `/api/flujo` |
| Modificar | `backend/src/controllers/finanzas.js` — auto-completar flujo al cobrar |
| Crear | `frontend/src/api/flujo.js` |
| Crear | `frontend/src/components/flujo/TarjetaPaciente.jsx` |
| Crear | `frontend/src/pages/ProcedimientosPage.jsx` |
| Modificar | `frontend/src/App.jsx` — import + route + NavItem |

---

### Task 1: Migración DB — consultorios + flujo_paciente

**Files:**
- Create: `backend/src/db/migrations/021_procedimientos_en_vivo.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- backend/src/db/migrations/021_procedimientos_en_vivo.sql

CREATE TABLE IF NOT EXISTS consultorios (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL,
  activo  BOOLEAN NOT NULL DEFAULT true,
  orden   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO consultorios (nombre, orden) VALUES
  ('Consultorio 1', 1),
  ('Consultorio 2', 2),
  ('Consultorio 3', 3)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS flujo_paciente (
  id                 SERIAL PRIMARY KEY,
  cita_id            INTEGER NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
  consultorio_id     INTEGER REFERENCES consultorios(id) ON DELETE SET NULL,
  estatus            VARCHAR(30) NOT NULL DEFAULT 'checkin'
                     CHECK (estatus IN ('checkin','en_consultorio','en_procedimiento',
                                        'cierre','en_caja','completado')),
  nota_visita_id     INTEGER REFERENCES notas_visita(id) ON DELETE SET NULL,
  hora_checkin       TIMESTAMPTZ DEFAULT NOW(),
  hora_consultorio   TIMESTAMPTZ,
  hora_procedimiento TIMESTAMPTZ,
  hora_cierre        TIMESTAMPTZ,
  hora_caja          TIMESTAMPTZ,
  hora_completado    TIMESTAMPTZ,
  created_by         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Verificar que las migraciones corren**

```bash
cd ~/elys && docker compose up -d
cd ~/elys/backend && npm run dev
```

Observar en la consola del backend: `Migración aplicada: 021_procedimientos_en_vivo.sql`. Sin errores.

- [ ] **Step 3: Commit**

```bash
cd ~/elys
git add backend/src/db/migrations/021_procedimientos_en_vivo.sql
git commit -m "feat: add consultorios and flujo_paciente tables (migration 021)"
```

---

### Task 2: Backend — Consultorios CRUD

**Files:**
- Create: `backend/src/controllers/consultoriosController.js`
- Create: `backend/src/routes/consultorios.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: Crear el controller**

```js
// backend/src/controllers/consultoriosController.js
const pool = require('../db/pool');

exports.list = async (req, res, next) => {
  try {
    const soloActivos = req.user.rol !== 'admin';
    const where = soloActivos ? 'WHERE activo = true' : '';
    const { rows } = await pool.query(
      `SELECT * FROM consultorios ${where} ORDER BY orden, nombre`
    );
    res.json(rows);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const { nombre, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    const { rows } = await pool.query(
      'INSERT INTO consultorios (nombre, orden) VALUES ($1, $2) RETURNING *',
      [nombre, orden || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const { nombre, activo, orden } = req.body;
    const { rows } = await pool.query(
      `UPDATE consultorios SET
         nombre = COALESCE($1, nombre),
         activo = COALESCE($2, activo),
         orden  = COALESCE($3, orden)
       WHERE id = $4 RETURNING *`,
      [nombre ?? null, activo ?? null, orden ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Crear las rutas**

```js
// backend/src/routes/consultorios.js
const router = require('express').Router();
const ctrl = require('../controllers/consultoriosController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
```

- [ ] **Step 3: Registrar en index.js**

En `backend/src/index.js`, agregar después de la línea `app.use('/api/caja', ...)`:

```js
app.use('/api/consultorios', authMiddleware, require('./routes/consultorios'));
```

- [ ] **Step 4: Verificar manualmente**

Con el backend corriendo:
```bash
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3008/api/consultorios
```
Debe responder: `[{"id":1,"nombre":"Consultorio 1",...}, ...]`

- [ ] **Step 5: Commit**

```bash
cd ~/elys
git add backend/src/controllers/consultoriosController.js \
        backend/src/routes/consultorios.js \
        backend/src/index.js
git commit -m "feat: add consultorios CRUD backend"
```

---

### Task 3: Backend — Flujo controller (hoy + checkin + avanzar)

**Files:**
- Create: `backend/src/controllers/flujoController.js`
- Create: `backend/src/routes/flujo.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: Crear flujoController.js**

```js
// backend/src/controllers/flujoController.js
const pool = require('../db/pool');

const ORDEN_ESTATUS = {
  checkin: 1, en_consultorio: 2, en_procedimiento: 3,
  cierre: 4, en_caja: 5, agendada: 6, completado: 7,
};

const SIGUIENTE = {
  checkin: 'en_consultorio',
  en_consultorio: 'en_procedimiento',
  en_procedimiento: 'cierre',
  cierre: 'en_caja',
  en_caja: 'completado',
};

const HORA_CAMPO = {
  en_consultorio: 'hora_consultorio',
  en_procedimiento: 'hora_procedimiento',
  cierre: 'hora_cierre',
  en_caja: 'hora_caja',
  completado: 'hora_completado',
};

exports.hoy = async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Auto-completar flujos en_caja donde ya se cobró
    await pool.query(
      `UPDATE flujo_paciente fp
       SET estatus = 'completado', hora_completado = NOW(), updated_at = NOW()
       FROM citas c
       WHERE fp.cita_id = c.id
         AND fp.estatus = 'en_caja'
         AND c.cobrado = true
         AND DATE(c.fecha_hora) = $1`,
      [hoy]
    );

    const { rows } = await pool.query(
      `SELECT
         c.id AS cita_id,
         fp.id AS flujo_id,
         COALESCE(fp.estatus, 'agendada') AS estatus,
         c.paciente_id,
         TRIM(COALESCE(
           NULLIF(CONCAT_WS(' ',
             NULLIF(p.apellido_paterno,''), NULLIF(p.apellido_materno,''), NULLIF(p.nombre,'')), ''),
           c.nombre_paciente
         )) AS paciente_nombre,
         t.nombre AS tratamiento_nombre,
         CONCAT(e.nombre, ' ', COALESCE(e.apellido_paterno,'')) AS empleada_nombre,
         co.nombre AS consultorio_nombre,
         fp.consultorio_id,
         c.fecha_hora,
         c.cobrado,
         fp.hora_checkin,
         fp.hora_consultorio,
         fp.hora_procedimiento,
         fp.hora_cierre,
         fp.hora_caja,
         fp.hora_completado,
         fp.nota_visita_id
       FROM citas c
       LEFT JOIN flujo_paciente fp ON fp.cita_id = c.id
       LEFT JOIN pacientes p       ON c.paciente_id = p.id
       LEFT JOIN tratamientos t    ON c.tratamiento_id = t.id
       LEFT JOIN empleados e       ON c.empleada_id = e.id
       LEFT JOIN consultorios co   ON fp.consultorio_id = co.id
       WHERE DATE(c.fecha_hora) = $1
         AND c.estatus != 'cancelada'
       ORDER BY c.fecha_hora`,
      [hoy]
    );

    const activos = rows.filter(r => r.estatus !== 'completado');
    const completados = rows.filter(r => r.estatus === 'completado');

    // Ordenar activos: activos en flujo primero (por orden de estatus), agendadas al final
    activos.sort((a, b) => (ORDEN_ESTATUS[a.estatus] || 99) - (ORDEN_ESTATUS[b.estatus] || 99));

    res.json({ activos, completados });
  } catch (err) { next(err); }
};

exports.checkin = async (req, res, next) => {
  try {
    const { cita_id } = req.params;
    const { consultorio_id } = req.body;
    if (!consultorio_id) return res.status(400).json({ error: 'consultorio_id es requerido' });

    // Verificar que la cita es de hoy y está pendiente
    const hoy = new Date().toISOString().split('T')[0];
    const { rows: citas } = await pool.query(
      `SELECT id FROM citas WHERE id=$1 AND DATE(fecha_hora)=$2 AND estatus='pendiente'`,
      [cita_id, hoy]
    );
    if (!citas[0]) return res.status(404).json({ error: 'Cita no encontrada o no es de hoy' });

    // Verificar que no tenga ya un flujo
    const { rows: existing } = await pool.query(
      'SELECT id FROM flujo_paciente WHERE cita_id=$1', [cita_id]
    );
    if (existing[0]) return res.status(409).json({ error: 'Esta cita ya tiene check-in' });

    const { rows } = await pool.query(
      `INSERT INTO flujo_paciente (cita_id, consultorio_id, estatus, hora_checkin, created_by)
       VALUES ($1, $2, 'checkin', NOW(), $3) RETURNING *`,
      [cita_id, consultorio_id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.avanzar = async (req, res, next) => {
  try {
    const { cita_id } = req.params;

    const { rows: flujos } = await pool.query(
      'SELECT * FROM flujo_paciente WHERE cita_id=$1', [cita_id]
    );
    if (!flujos[0]) return res.status(404).json({ error: 'No hay flujo para esta cita' });
    const flujo = flujos[0];

    const siguiente = SIGUIENTE[flujo.estatus];
    if (!siguiente) return res.status(400).json({ error: 'No hay siguiente estado' });

    // Bloqueo: cierre → en_caja requiere nota SOAP
    if (flujo.estatus === 'cierre') {
      const { rows: notas } = await pool.query(
        'SELECT id FROM notas_visita WHERE cita_id=$1 LIMIT 1', [cita_id]
      );
      if (!notas[0]) {
        return res.status(409).json({ error: 'Debes completar la nota SOAP antes de continuar' });
      }
      // Guardar nota_visita_id y marcar cita como realizada
      await pool.query(
        `UPDATE flujo_paciente
         SET estatus=$1, ${HORA_CAMPO[siguiente]}=NOW(), nota_visita_id=$2, updated_at=NOW()
         WHERE id=$3`,
        [siguiente, notas[0].id, flujo.id]
      );
      await pool.query('UPDATE citas SET estatus=$1 WHERE id=$2', ['realizada', cita_id]);
      const { rows: updated } = await pool.query('SELECT * FROM flujo_paciente WHERE id=$1', [flujo.id]);
      return res.json(updated[0]);
    }

    const campo = HORA_CAMPO[siguiente];
    const { rows } = await pool.query(
      `UPDATE flujo_paciente
       SET estatus=$1, ${campo}=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [siguiente, flujo.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Crear las rutas**

```js
// backend/src/routes/flujo.js
const router = require('express').Router();
const ctrl = require('../controllers/flujoController');

router.get('/hoy', ctrl.hoy);
router.post('/:cita_id/checkin', ctrl.checkin);
router.patch('/:cita_id/avanzar', ctrl.avanzar);

module.exports = router;
```

- [ ] **Step 3: Registrar en index.js**

En `backend/src/index.js`, agregar después de `app.use('/api/consultorios', ...)`:

```js
app.use('/api/flujo', authMiddleware, require('./routes/flujo'));
```

- [ ] **Step 4: Verificar manualmente**

```bash
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3008/api/flujo/hoy
```
Debe responder `{"activos":[...],"completados":[]}` con las citas de hoy en estado `agendada`.

- [ ] **Step 5: Commit**

```bash
cd ~/elys
git add backend/src/controllers/flujoController.js \
        backend/src/routes/flujo.js \
        backend/src/index.js
git commit -m "feat: add flujo_paciente backend (hoy, checkin, avanzar)"
```

---

### Task 4: Backend — Auto-completar flujo al cobrar en Caja

**Files:**
- Modify: `backend/src/controllers/finanzas.js`

- [ ] **Step 1: Modificar createMovimiento en finanzas.js**

En `backend/src/controllers/finanzas.js`, localizar el bloque `if (cita_id)` que ya existe tras crear el movimiento y agregar el UPDATE al flujo:

```js
// Reemplazar el bloque if (cita_id) existente con:
if (cita_id) {
  await pool.query('UPDATE citas SET cobrado = true WHERE id = $1', [cita_id]);
  await pool.query(
    `UPDATE flujo_paciente
     SET estatus = 'completado', hora_completado = NOW(), updated_at = NOW()
     WHERE cita_id = $1 AND estatus = 'en_caja'`,
    [cita_id]
  );
}
```

- [ ] **Step 2: Verificar que el backend arranca sin error**

```bash
cd ~/elys/backend && npm run dev
```
Sin errores de sintaxis en la consola.

- [ ] **Step 3: Commit**

```bash
cd ~/elys
git add backend/src/controllers/finanzas.js
git commit -m "feat: auto-complete flujo_paciente when cita is paid via caja"
```

---

### Task 5: Frontend — API client flujo.js

**Files:**
- Create: `frontend/src/api/flujo.js`

- [ ] **Step 1: Crear el archivo**

```js
// frontend/src/api/flujo.js
import api from './client';

export const getFlujoHoy       = ()                    => api.get('/flujo/hoy').then(r => r.data);
export const checkinCita       = (cita_id, data)       => api.post(`/flujo/${cita_id}/checkin`, data).then(r => r.data);
export const avanzarFlujo      = (cita_id)             => api.patch(`/flujo/${cita_id}/avanzar`).then(r => r.data);
export const getConsultorios   = ()                    => api.get('/consultorios').then(r => r.data);
export const createConsultorio = (data)                => api.post('/consultorios', data).then(r => r.data);
export const updateConsultorio = (id, data)            => api.put(`/consultorios/${id}`, data).then(r => r.data);
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys
git add frontend/src/api/flujo.js
git commit -m "feat: add flujo API client"
```

---

### Task 6: Frontend — TarjetaPaciente component

**Files:**
- Create: `frontend/src/components/flujo/TarjetaPaciente.jsx`

- [ ] **Step 1: Crear el directorio y el componente**

```jsx
// frontend/src/components/flujo/TarjetaPaciente.jsx
import { useState } from 'react';
import { checkinCita, avanzarFlujo } from '../../api/flujo';
import NotaVisitaModal from '../NotaVisitaModal';

const ESTATUS_CONFIG = {
  agendada:        { color: '#cccad8', label: 'Agendada',        orden: 0 },
  checkin:         { color: '#4a7c6a', label: 'Check-in',        orden: 1 },
  en_consultorio:  { color: '#5a6aa0', label: 'En consultorio',  orden: 2 },
  en_procedimiento:{ color: '#7a6ab0', label: 'En procedimiento',orden: 3 },
  cierre:          { color: '#887482', label: 'Cierre',          orden: 4 },
  en_caja:         { color: '#c07030', label: 'En caja',         orden: 5 },
  completado:      { color: '#3d7a3d', label: 'Completado',      orden: 6 },
};

const PASOS = ['agendada','checkin','en_consultorio','en_procedimiento','cierre','en_caja','completado'];

function tiempoTranscurrido(isoStr) {
  if (!isoStr) return null;
  const mins = Math.floor((Date.now() - new Date(isoStr)) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function TarjetaPaciente({ cita, rol, consultorios, onRefresh }) {
  const [expandCheckin, setExpandCheckin] = useState(false);
  const [consultorioSel, setConsultorioSel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notaModal, setNotaModal] = useState(false);

  const cfg = ESTATUS_CONFIG[cita.estatus] || ESTATUS_CONFIG.agendada;
  const ordenActual = PASOS.indexOf(cita.estatus);

  const puedeCheckin      = ['admin','asistente_general'].includes(rol);
  const puedeTratante     = ['admin','asistente_medico','cosmetista'].includes(rol);
  const puedeCaja         = ['admin','asistente_general'].includes(rol);

  async function handleCheckin() {
    if (!consultorioSel) { setError('Selecciona un consultorio'); return; }
    setLoading(true); setError('');
    try {
      await checkinCita(cita.cita_id, { consultorio_id: parseInt(consultorioSel) });
      onRefresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al hacer check-in');
    } finally { setLoading(false); }
  }

  async function handleAvanzar() {
    setLoading(true); setError('');
    try {
      await avanzarFlujo(cita.cita_id);
      onRefresh();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al avanzar');
    } finally { setLoading(false); }
  }

  function handleNotaGuardada() {
    setNotaModal(false);
    // Intentar avanzar automáticamente tras guardar la nota
    avanzarFlujo(cita.cita_id)
      .then(onRefresh)
      .catch(e => setError(e.response?.data?.error || 'Error al avanzar'));
  }

  const horaRef = cita.hora_checkin || cita.fecha_hora;
  const tiempo = tiempoTranscurrido(cita.hora_checkin);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
         style={{ borderColor: 'var(--color-sage)', borderLeft: `4px solid ${cfg.color}` }}>
      <div className="px-4 py-3">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-dark)' }}>
              {cita.paciente_nombre}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {cita.tratamiento_nombre || '—'}
              {cita.consultorio_nombre && <span className="ml-2 text-gray-400">· {cita.consultorio_nombre}</span>}
              {cita.empleada_nombre?.trim() && <span className="ml-2 text-gray-400">· {cita.empleada_nombre.trim()}</span>}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: cfg.color }}>
              {cfg.label}
            </span>
            {tiempo && (
              <p className="text-xs text-gray-400 mt-0.5">{tiempo}</p>
            )}
          </div>
        </div>

        {/* Pipeline de pasos */}
        <div className="flex items-center gap-0.5 mt-2">
          {PASOS.filter(p => p !== 'agendada').map((paso, i) => {
            const pasoOrden = PASOS.indexOf(paso);
            const hecho = pasoOrden <= ordenActual;
            const actual = paso === cita.estatus;
            return (
              <div key={paso} className="flex items-center flex-1">
                <div className="h-1.5 flex-1 rounded-full"
                     style={{ backgroundColor: hecho ? ESTATUS_CONFIG[paso].color : '#e5e7eb',
                              opacity: actual ? 1 : hecho ? 0.8 : 0.4 }} />
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        {/* Botón de acción según estado */}
        <div className="mt-3 flex gap-2">
          {/* AGENDADA — Check-in */}
          {cita.estatus === 'agendada' && puedeCheckin && (
            <div className="w-full">
              {!expandCheckin ? (
                <button onClick={() => setExpandCheckin(true)}
                        className="w-full text-sm py-1.5 rounded-lg text-white font-medium"
                        style={{ backgroundColor: '#4a7c6a' }}>
                  ✓ Check-in
                </button>
              ) : (
                <div className="flex gap-2">
                  <select value={consultorioSel} onChange={e => setConsultorioSel(e.target.value)}
                          className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                          style={{ borderColor: 'var(--color-sage)' }}>
                    <option value="">— Consultorio —</option>
                    {consultorios.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <button onClick={handleCheckin} disabled={loading}
                          className="px-3 py-1.5 text-sm rounded-lg text-white font-medium disabled:opacity-50"
                          style={{ backgroundColor: '#4a7c6a' }}>
                    {loading ? '...' : 'OK'}
                  </button>
                  <button onClick={() => { setExpandCheckin(false); setError(''); }}
                          className="px-2 py-1.5 text-sm rounded-lg border"
                          style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CHECKIN → en_consultorio */}
          {cita.estatus === 'checkin' && puedeTratante && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="flex-1 text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#5a6aa0' }}>
              {loading ? '...' : '→ Pasar a consultorio'}
            </button>
          )}

          {/* EN_CONSULTORIO → en_procedimiento */}
          {cita.estatus === 'en_consultorio' && puedeTratante && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="flex-1 text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#7a6ab0' }}>
              {loading ? '...' : '⚡ Iniciar procedimiento'}
            </button>
          )}

          {/* EN_PROCEDIMIENTO → cierre */}
          {cita.estatus === 'en_procedimiento' && puedeTratante && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="flex-1 text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#887482' }}>
              {loading ? '...' : '✓ Terminar procedimiento'}
            </button>
          )}

          {/* CIERRE → nota SOAP → en_caja */}
          {cita.estatus === 'cierre' && puedeTratante && (
            <button onClick={() => setNotaModal(true)} disabled={loading}
                    className="flex-1 text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#887482' }}>
              📋 Completar nota SOAP
            </button>
          )}

          {/* EN_CAJA → completado */}
          {cita.estatus === 'en_caja' && puedeCaja && (
            <button onClick={handleAvanzar} disabled={loading}
                    className="flex-1 text-sm py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#c07030' }}>
              {loading ? '...' : '💳 Confirmar pago recibido'}
            </button>
          )}

          {/* COMPLETADO */}
          {cita.estatus === 'completado' && (
            <span className="text-xs text-gray-400">✓ Visita completada</span>
          )}
        </div>
      </div>

      {/* Modal Nota SOAP */}
      {notaModal && cita.paciente_id && (
        <NotaVisitaModal
          cita={{ id: cita.cita_id, tratamiento_nombre: cita.tratamiento_nombre }}
          pacienteId={cita.paciente_id}
          onClose={() => setNotaModal(false)}
          onSaved={handleNotaGuardada}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que NotaVisitaModal acepta las props usadas**

Abrir `frontend/src/components/NotaVisitaModal.jsx` y confirmar que acepta:
- `cita` — con `id` y opcionalmente `tratamiento_nombre`
- `pacienteId` — id del paciente
- `onClose` — función
- `onSaved` — función

Si los nombres de props difieren, ajustar la llamada en `TarjetaPaciente.jsx` para que coincidan con los props reales.

- [ ] **Step 3: Commit**

```bash
cd ~/elys
git add frontend/src/components/flujo/TarjetaPaciente.jsx
git commit -m "feat: add TarjetaPaciente component with full flow actions"
```

---

### Task 7: Frontend — ProcedimientosPage

**Files:**
- Create: `frontend/src/pages/ProcedimientosPage.jsx`

- [ ] **Step 1: Crear la página**

```jsx
// frontend/src/pages/ProcedimientosPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, RefreshCw, Plus, Pencil } from 'lucide-react';
import { getFlujoHoy, getConsultorios, createConsultorio, updateConsultorio } from '../api/flujo';
import TarjetaPaciente from '../components/flujo/TarjetaPaciente';

export default function ProcedimientosPage() {
  const rol = localStorage.getItem('rol');
  const [tab, setTab] = useState('enlive');
  const [datos, setDatos] = useState({ activos: [], completados: [] });
  const [consultorios, setConsultorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [completadosAbiertos, setCompletadosAbiertos] = useState(false);
  // Estado para CRUD consultorios
  const [formConsult, setFormConsult] = useState({ nombre: '', orden: '' });
  const [editConsult, setEditConsult] = useState(null);
  const [loadingConsult, setLoadingConsult] = useState(false);
  const intervalRef = useRef(null);

  const cargarConsultorios = useCallback(() =>
    getConsultorios().then(setConsultorios).catch(console.error), []);

  const cargar = useCallback(async () => {
    try {
      const [data] = await Promise.all([getFlujoHoy(), cargarConsultorios()]);
      setDatos(data);
      setUltimaAct(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [cargarConsultorios]);

  useEffect(() => {
    cargar();
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [cargar]);

  async function handleSaveConsultorio(e) {
    e.preventDefault();
    setLoadingConsult(true);
    try {
      const data = { nombre: formConsult.nombre, orden: parseInt(formConsult.orden) || 0 };
      if (editConsult) {
        await updateConsultorio(editConsult.id, data);
      } else {
        await createConsultorio(data);
      }
      setFormConsult({ nombre: '', orden: '' });
      setEditConsult(null);
      cargarConsultorios();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setLoadingConsult(false); }
  }

  function iniciarEditarConsultorio(c) {
    setEditConsult(c);
    setFormConsult({ nombre: c.nombre, orden: String(c.orden) });
  }

  async function toggleActivoConsultorio(c) {
    await updateConsultorio(c.id, { activo: !c.activo });
    cargarConsultorios();
  }

  if (loading) return (
    <div className="py-16 text-center text-gray-400 text-sm">Cargando procedimientos…</div>
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #7a6ab0, #887482)' }}>
            <Activity className="w-5 h-5 text-white" strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>
              Procedimientos en vivo
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
              {ultimaAct
                ? `Actualizado: ${ultimaAct.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                : 'Cargando…'}
            </p>
          </div>
        </div>
        <button onClick={cargar}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg"
                style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
          <RefreshCw className="w-3 h-3" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--color-sage)' }}>
        {[
          { id: 'enlive', label: 'En vivo' },
          ...(rol === 'admin' ? [{ id: 'consultorios', label: 'Consultorios' }] : []),
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
                  className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                  style={{
                    borderColor: tab === id ? 'var(--color-accent)' : 'transparent',
                    color: tab === id ? 'var(--color-dark)' : 'var(--color-accent)',
                  }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: En vivo ─────────────────────────────────────────────────────── */}
      {tab === 'enlive' && (
        <div className="space-y-6">
          {/* Activos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                Activos
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
                {datos.activos.length}
              </span>
            </div>
            {datos.activos.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm"
                   style={{ borderColor: 'var(--color-sage)' }}>
                Sin pacientes activos hoy
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {datos.activos.map(cita => (
                  <TarjetaPaciente
                    key={cita.cita_id}
                    cita={cita}
                    rol={rol}
                    consultorios={consultorios}
                    onRefresh={cargar}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Completados */}
          {datos.completados.length > 0 && (
            <div>
              <button
                onClick={() => setCompletadosAbiertos(o => !o)}
                className="flex items-center gap-2 mb-3 w-full text-left">
                <h2 className="text-sm font-semibold text-gray-400">
                  Completados ({datos.completados.length})
                </h2>
                <span className="text-xs text-gray-400">{completadosAbiertos ? '▲' : '▼'}</span>
              </button>
              {completadosAbiertos && (
                <div className="grid gap-3 sm:grid-cols-2 opacity-60">
                  {datos.completados.map(cita => (
                    <TarjetaPaciente
                      key={cita.cita_id}
                      cita={cita}
                      rol={rol}
                      consultorios={consultorios}
                      onRefresh={cargar}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Consultorios (solo admin) ───────────────────────────────────── */}
      {tab === 'consultorios' && rol === 'admin' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveConsultorio}
                className="bg-white rounded-xl border p-4 flex gap-3 items-end flex-wrap"
                style={{ borderColor: 'var(--color-sage)' }}>
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input type="text" required value={formConsult.nombre}
                     onChange={e => setFormConsult(f => ({ ...f, nombre: e.target.value }))}
                     placeholder="ej. Consultorio 1"
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
              <input type="number" min="0" value={formConsult.orden}
                     onChange={e => setFormConsult(f => ({ ...f, orden: e.target.value }))}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loadingConsult}
                      className="px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {editConsult ? 'Actualizar' : 'Agregar'}
              </button>
              {editConsult && (
                <button type="button"
                        onClick={() => { setEditConsult(null); setFormConsult({ nombre: '', orden: '' }); }}
                        className="px-3 py-2 text-sm border rounded-lg"
                        style={{ borderColor: 'var(--color-sage)', color: 'var(--color-accent)' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="bg-white rounded-xl border overflow-hidden"
               style={{ borderColor: 'var(--color-sage)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-primary)' }}>
                <tr>
                  {['Orden','Nombre','Estado',''].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consultorios.map(c => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-2 text-gray-400 text-xs">{c.orden}</td>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-dark)' }}>{c.nombre}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => toggleActivoConsultorio(c)}
                              className="text-xs px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: c.activo ? '#4a7c6a' : '#d1d5db',
                                color: c.activo ? '#4a7c6a' : '#9ca3af',
                              }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => iniciarEditarConsultorio(c)}
                              className="p-1 rounded hover:bg-gray-100">
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/elys
git add frontend/src/pages/ProcedimientosPage.jsx
git commit -m "feat: add ProcedimientosPage with live panel and consultorios management"
```

---

### Task 8: Frontend — Registrar ruta y NavItem en App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Agregar import de ProcedimientosPage**

En `frontend/src/App.jsx`, después de `import FinanzasPage from './pages/FinanzasPage';`:

```js
import ProcedimientosPage from './pages/ProcedimientosPage';
```

- [ ] **Step 2: Agregar NavItem en la navegación**

En el bloque `<div className="flex gap-1 flex-1 flex-wrap">`, agregar después de `<NavItem to="/citas">Citas</NavItem>`:

```jsx
<NavItem to="/procedimientos">En vivo</NavItem>
```

- [ ] **Step 3: Agregar Route**

En el bloque `<Routes>` dentro de `Layout`, agregar después de `<Route path="/citas" ...>`:

```jsx
<Route path="/procedimientos" element={<ProcedimientosPage />} />
```

- [ ] **Step 4: Verificar props de NotaVisitaModal**

Abrir `frontend/src/components/NotaVisitaModal.jsx` y verificar los nombres exactos de props. Si los props son distintos a `cita`, `pacienteId`, `onClose`, `onSaved` — actualizar la llamada en `TarjetaPaciente.jsx` (líneas donde se usa `<NotaVisitaModal>`).

- [ ] **Step 5: Commit**

```bash
cd ~/elys
git add frontend/src/App.jsx
git commit -m "feat: add Procedimientos en vivo route and nav item"
```

---

### Task 9: Build y Deploy

**Files:** ninguno nuevo — build + deploy

- [ ] **Step 1: Build frontend**

```bash
cd ~/elys/frontend && npm run build 2>&1 | tail -10
```

Esperado: `✓ built in X.XXs` sin errores de compilación.

- [ ] **Step 2: Deploy**

```bash
cd ~/elys && ./deploy.sh 2>&1 | tail -8
```

Esperado: `✓ Deploy Elys completado` y `elys-backend` en estado `online`.

- [ ] **Step 3: Verificar en producción**

Abrir `http://62.238.3.136:8088` → login → confirmar que aparece "En vivo" en la navegación.

Navegar a `/procedimientos` → ver panel con citas del día en estado `agendada`.

Probar: hacer check-in de una cita → asignar consultorio → avanzar hasta cierre → abrir nota SOAP → guardar → confirmar que pasa a "En caja".
