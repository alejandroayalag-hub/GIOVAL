# Módulo Procedimientos en Vivo — Design Spec

## Goal

Panel operativo en tiempo real para seguir el flujo de cada paciente durante su visita: desde que llega (check-in) hasta que paga en caja. Cada rol de la clínica ve solo las acciones que le corresponden. Auto-refresca cada 30 segundos.

## Architecture

Nuevo módulo "Procedimientos en vivo" con su propio tab en el menú lateral. Nueva tabla `flujo_paciente` como capa de estado operativo sobre las citas existentes. Las citas del día aparecen automáticamente; el flujo se crea cuando la asistente hace check-in. Se integra con el módulo Caja (la cita avanza a "completado" cuando `cita.cobrado = true`) y con Notas de Visita (la SOAP es requisito para pasar de cierre a caja).

## Tech Stack

React 19 + Vite 8, Express 5, PostgreSQL 16, Tailwind v4, patrón existente del proyecto.

---

## Estados del Flujo

| Estado | Descripción | Quién actúa |
|--------|-------------|-------------|
| `agendada` | Cita del día sin check-in aún. Estado virtual (no hay registro en flujo_paciente). | — |
| `checkin` | Paciente llegó. Asistente lo asigna a un consultorio. | admin, asistente_general |
| `en_consultorio` | Paciente en el cuarto, esperando al tratante. | asistente_medico, cosmetista, admin |
| `en_procedimiento` | Tratamiento activo. Se registra hora de inicio. | asistente_medico, cosmetista, admin |
| `cierre` | Procedimiento terminado. Tratante debe completar nota SOAP antes de avanzar. | asistente_medico, cosmetista, admin |
| `en_caja` | Nota SOAP guardada. Paciente pasa a pagar. Cita se marca `realizada`. | admin, asistente_general |
| `completado` | Cobro recibido (`cita.cobrado = true`). Visita cerrada. | auto / admin, asistente_general |

---

## Data Model

### Migración 021

```sql
-- Consultorios configurables
CREATE TABLE IF NOT EXISTS consultorios (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL,
  activo  BOOLEAN NOT NULL DEFAULT true,
  orden   INTEGER NOT NULL DEFAULT 0
);

-- Seed inicial (3 consultorios genéricos)
INSERT INTO consultorios (nombre, orden) VALUES
  ('Consultorio 1', 1),
  ('Consultorio 2', 2),
  ('Consultorio 3', 3);

-- Flujo operativo por cita
CREATE TABLE IF NOT EXISTS flujo_paciente (
  id                 SERIAL PRIMARY KEY,
  cita_id            INTEGER NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
  consultorio_id     INTEGER REFERENCES consultorios(id) ON DELETE SET NULL,
  estatus            VARCHAR(30) NOT NULL DEFAULT 'checkin'
                     CHECK (estatus IN ('checkin','en_consultorio','en_procedimiento','cierre','en_caja','completado')),
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

---

## Backend

### Archivos nuevos/modificados

| Acción | Archivo |
|--------|---------|
| Crear | `backend/src/db/migrations/021_procedimientos_en_vivo.sql` |
| Crear | `backend/src/controllers/flujoController.js` |
| Crear | `backend/src/routes/flujo.js` |
| Crear | `backend/src/controllers/consultoriosController.js` |
| Crear | `backend/src/routes/consultorios.js` |
| Modificar | `backend/src/index.js` (registrar rutas) |
| Modificar | `backend/src/controllers/finanzas.js` (auto-completar flujo al cobrar) |

### GET /api/flujo/hoy

Devuelve todas las citas de hoy agrupadas en `activos` y `completados`.

**Lógica:**
1. Citas con `DATE(fecha_hora) = hoy` que no estén canceladas
2. JOIN LEFT con `flujo_paciente`
3. Citas sin flujo_paciente → estatus virtual `agendada`
4. Registros flujo en `en_caja` donde `cita.cobrado = true` → auto-avanza a `completado` lazy (UPDATE + return `completado`)

**Respuesta:**
```json
{
  "activos": [
    {
      "cita_id": 5,
      "flujo_id": 3,
      "estatus": "en_procedimiento",
      "paciente_nombre": "García López María",
      "tratamiento_nombre": "Botox tercio superior",
      "empleada_nombre": "Dra. Giovanna",
      "consultorio_nombre": "Consultorio 1",
      "consultorio_id": 1,
      "fecha_hora": "2026-06-08T11:00:00Z",
      "hora_checkin": "2026-06-08T11:05:00Z",
      "hora_procedimiento": "2026-06-08T11:20:00Z",
      "nota_visita_id": null,
      "paciente_id": 12,
      "cobrado": false
    }
  ],
  "completados": [...]
}
```

### POST /api/flujo/:cita_id/checkin

Body: `{ consultorio_id: number }`

Crea registro en `flujo_paciente` con `estatus='checkin'`, `consultorio_id`, `hora_checkin=NOW()`.

Validaciones:
- Cita debe ser de hoy y estatus `pendiente`
- No debe tener ya un flujo_paciente
- `consultorio_id` debe existir y estar activo

### PATCH /api/flujo/:cita_id/avanzar

Body: `{ consultorio_id?: number }` (solo para transición checkin→en_consultorio si se cambia consultorio)

Avance automático al siguiente estado según el actual:

| Desde | Hacia | Validación extra |
|-------|-------|-----------------|
| `checkin` | `en_consultorio` | — |
| `en_consultorio` | `en_procedimiento` | — |
| `en_procedimiento` | `cierre` | — |
| `cierre` | `en_caja` | Debe existir `notas_visita.cita_id = cita_id`. Si no, error 409. Si existe: guarda `flujo_paciente.nota_visita_id = nota.id` y `UPDATE citas SET estatus='realizada'` |
| `en_caja` | `completado` | — (manual si cobrado=false; auto si cobrado=true) |

Actualiza el timestamp correspondiente (`hora_consultorio`, `hora_procedimiento`, etc.) y `updated_at`.

### GET /api/consultorios

Lista todos los consultorios activos ordenados por `orden`.

### POST /api/consultorios (admin)

Body: `{ nombre, orden? }`

### PUT /api/consultorios/:id (admin)

Body: `{ nombre?, activo?, orden? }`

### Modificación: POST /api/movimientos (finanzas.js)

Cuando `cita_id` viene en el body y se crea el movimiento (cobro), además de `UPDATE citas SET cobrado=true`:

```js
await pool.query(
  `UPDATE flujo_paciente SET estatus='completado', hora_completado=NOW(), updated_at=NOW()
   WHERE cita_id=$1 AND estatus='en_caja'`,
  [cita_id]
);
```

---

## Frontend

### Archivos nuevos/modificados

| Acción | Archivo |
|--------|---------|
| Crear | `frontend/src/pages/ProcedimientosPage.jsx` |
| Crear | `frontend/src/components/flujo/TarjetaPaciente.jsx` |
| Crear | `frontend/src/api/flujo.js` |
| Modificar | `frontend/src/App.jsx` (ruta + NavItem inline) |

### ProcedimientosPage.jsx

Dos tabs:
- **"En vivo"** (default) — panel del flujo
- **"Consultorios"** (solo admin) — CRUD de consultorios

**Estado:**
- `datos` — `{ activos, completados }` de `GET /api/flujo/hoy`
- `consultoriosList` — lista de consultorios para el selector
- `loading`, `error`
- Auto-refresh cada 30s (pausa si `document.visibilityState !== 'visible'`)
- Botón `↺ Actualizar` manual

**Layout En vivo:**

```
[Procedimientos en vivo]     [↺ Actualizar]  [última act: HH:MM]

ACTIVOS (N)
─────────────────────────────────────────────
  [TarjetaPaciente] × N (ordenadas por hora_checkin asc, agendadas al final)

COMPLETADOS (N)  [colapsar ▾]
─────────────────────────────────────────────
  [TarjetaPaciente completada] × N (grises, sin botones de acción)
```

### TarjetaPaciente.jsx

Props: `{ cita, rol, consultorios, onRefresh }`

**Visual:**
- Barra de color izquierda según estatus
- Nombre del paciente (grande), tratamiento, hora, consultorio asignado
- Pipeline de pasos: `Agendada → Check-in → Consultorio → Procedimiento → Cierre → Caja → ✓`  
  — Pasos completados en color lleno, paso actual parpadeante, siguientes en gris
- Tiempo transcurrido desde check-in (ej. "38 min")
- Botón de acción principal según estado + rol

**Acciones por estado:**

| Estado | Botón principal | Quién lo ve | Acción |
|--------|----------------|-------------|--------|
| `agendada` | `✓ Check-in` | admin, asistente_general | Abre mini-modal: selector de consultorio → POST /flujo/:id/checkin |
| `checkin` | `→ Pasar a consultorio` | admin, asistente_medico, cosmetista | PATCH /flujo/:id/avanzar |
| `en_consultorio` | `⚡ Iniciar procedimiento` | admin, asistente_medico, cosmetista | PATCH /flujo/:id/avanzar |
| `en_procedimiento` | `✓ Terminar procedimiento` | admin, asistente_medico, cosmetista | PATCH /flujo/:id/avanzar |
| `cierre` | `📋 Completar nota SOAP` | admin, asistente_medico, cosmetista | Abre NotaVisitaModal existente; al guardar → PATCH /flujo/:id/avanzar |
| `en_caja` | `💳 Confirmar pago` | admin, asistente_general | PATCH /flujo/:id/avanzar (manual si no cobrado aún) |
| `completado` | — | — | Solo muestra marca ✓ |

**Check-in mini-modal:** inline (no modal separado), aparece debajo de la tarjeta: selector de consultorio + botón confirmar.

**Bloqueo de SOAP:** Si el tratante intenta avanzar desde `cierre` sin nota guardada, el backend devuelve 409 y el frontend muestra "Debes completar la nota SOAP antes de continuar".

### frontend/src/api/flujo.js

```js
import api from './client';

export const getFlujoHoy       = ()                   => api.get('/flujo/hoy').then(r => r.data);
export const checkinCita       = (cita_id, data)      => api.post(`/flujo/${cita_id}/checkin`, data).then(r => r.data);
export const avanzarFlujo      = (cita_id, data = {}) => api.patch(`/flujo/${cita_id}/avanzar`, data).then(r => r.data);
export const getConsultorios   = ()                   => api.get('/consultorios').then(r => r.data);
export const createConsultorio = (data)               => api.post('/consultorios', data).then(r => r.data);
export const updateConsultorio = (id, data)           => api.put(`/consultorios/${id}`, data).then(r => r.data);
```

---

## Navegación

En `App.jsx` (que contiene la navegación inline con `NavItem`):
- Importar `ProcedimientosPage`
- Agregar ruta `<Route path="/procedimientos" element={<ProtectedRoute><ProcedimientosPage /></ProtectedRoute>} />`
- Agregar `<NavItem to="/procedimientos">En vivo</NavItem>` entre Citas y Pacientes

Visible para todos los roles (cada rol ve solo sus acciones dentro del módulo).

---

## Integración con módulos existentes

### → Notas de Visita
El botón "Completar nota SOAP" en estado `cierre` reutiliza `NotaVisitaModal` existente. Al guardar exitosamente, el frontend llama `PATCH /flujo/:cita_id/avanzar` que verifica la nota en DB.

### → Módulo Caja
Cuando `POST /api/movimientos` incluye `cita_id`, el controller de finanzas ya marca `cita.cobrado=true`. Se agrega: UPDATE flujo_paciente a `completado` si está en `en_caja`.

### → Citas (estatus)
Al avanzar de `cierre` a `en_caja`, el backend actualiza `citas.estatus = 'realizada'`. Así la cita aparece en los pendientes de cobro del módulo Caja automáticamente.

---

## Constraints

- Solo citas de hoy (DATE(fecha_hora) = hoy) aparecen en el panel activo
- Citas canceladas no aparecen
- Cada cita puede tener solo un flujo_paciente (UNIQUE constraint)
- La transición `cierre → en_caja` bloquea si no existe nota de visita para esa cita
- Los registros `completado` del día se muestran colapsados al fondo
- Auto-refresh pausa cuando el tab del browser no está visible
