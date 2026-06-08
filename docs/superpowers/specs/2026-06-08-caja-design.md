# Módulo Caja — Design Spec

## Goal

Panel operativo de caja en tiempo real para Gioval Medicina Estética: muestra el estado del día (ingresos por forma de pago), citas realizadas pendientes de cobro con cobro rápido en un clic, y todos los movimientos del día. Se auto-refresca cada 30 segundos.

## Architecture

Nueva pestaña "Caja" en `FinanzasPage` (primera pestaña, antes de Movimientos). Un endpoint `GET /api/caja/hoy` agrega la información necesaria. El cobro rápido llama al endpoint existente `POST /api/movimientos` con `cita_id` extra. El catálogo de tratamientos gana `precio` editable inline.

## Tech Stack

React 19 + Vite 8, Express 5, PostgreSQL 16, Tailwind v4, patrón existente de finanzas.

---

## Data Model

### Migración 020: precio en tratamientos + cobrado en citas + cita_id en movimientos

```sql
ALTER TABLE tratamientos ADD COLUMN IF NOT EXISTS precio NUMERIC(10,2);
ALTER TABLE citas        ADD COLUMN IF NOT EXISTS cobrado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE movimientos  ADD COLUMN IF NOT EXISTS cita_id INTEGER REFERENCES citas(id) ON DELETE SET NULL;
```

---

## Backend

### Nuevo endpoint: GET /api/caja/hoy

Devuelve en una sola llamada:

```json
{
  "resumen": {
    "efectivo":      1200.00,
    "tarjeta":        800.00,
    "transferencia":  500.00,
    "total":         2500.00
  },
  "pendientes": [
    {
      "cita_id":           5,
      "paciente_nombre":   "Ramírez Torres Sofía",
      "tratamiento_nombre":"Botox tercio superior",
      "precio":            1800.00,
      "fecha_hora":        "2026-06-08T11:00:00Z"
    }
  ],
  "movimientos": [
    {
      "id": 12,
      "concepto": "Botox tercio superior",
      "monto": 1200.00,
      "tipo": "ingreso",
      "forma_pago": "efectivo",
      "cita_id": 4,
      "paciente_nombre": "González Pérez María",
      "created_at": "2026-06-08T10:32:00Z"
    }
  ]
}
```

**Lógica SQL:**
- `resumen`: SUM de movimientos tipo `ingreso` de hoy agrupados por `forma_pago` (solo ingresos, no egresos, para el resumen de cobros de caja)
- `pendientes`: citas con `estatus = 'realizada'` Y `cobrado = false` del día de hoy, JOIN con pacientes y tratamientos
- `movimientos`: todos los movimientos de hoy (ingreso y egreso) ORDER BY created_at DESC, con LEFT JOIN a citas y pacientes para mostrar nombre cuando aplique

### Modificación: POST /api/movimientos

Acepta el campo opcional `cita_id`. Si viene, al crear el movimiento también ejecuta `UPDATE citas SET cobrado = true WHERE id = $cita_id`.

### Nuevo endpoint: PATCH /api/tratamientos/:id/precio

Actualiza solo el campo `precio` de un tratamiento. Solo admin.

```json
{ "precio": 1800.00 }
```

Responde con el tratamiento actualizado.

---

## Frontend

### Archivo nuevo: `frontend/src/components/finanzas/CajaPanel.jsx`

Props: ninguna (carga sus propios datos).

**Estado:**
- `datos` — respuesta de GET /api/caja/hoy (`{ resumen, pendientes, movimientos }`)
- `loading`, `error`
- `ultimaActualizacion` — timestamp del último fetch
- `cobrandoId` — cita_id del cobro en proceso (deshabilita botones de esa fila)
- `movModal` — `null` | `{ cita }` para abrir MovimientoModal con datos pre-llenados

**Auto-refresh:** `setInterval(cargar, 30_000)` limpiado en unmount. Botón `↺` manual adicional.

**Layout:**

```
[Última actualización hace Xs]  [↺ Actualizar]

┌──────────────────────────────────────────────────┐
│  Efectivo      Tarjeta    Transferencia   TOTAL   │
│  $X,XXX        $X,XXX     $X,XXX         $X,XXX  │
└──────────────────────────────────────────────────┘

PENDIENTES DE COBRAR  (badge con count)
─────────────────────────────────────────────────
  Ramírez Torres Sofía · Botox tercio sup · $1,800
  [Efectivo]  [Tarjeta]  [Transferencia]  [✎ Editar]
─────────────────────────────────────────────────
  (vacío si no hay pendientes: "Sin citas pendientes de cobro")

COBROS Y MOVIMIENTOS DE HOY          [+ Movimiento]
─────────────────────────────────────────────────
  ✓ González · Botox · $1,200 · Efectivo · 10:32
  ↓ Renta local · $800 · Efectivo · 09:15
  ✓ López · Limpieza · $650 · Tarjeta · 11:05
```

**Cobro rápido (botones Efectivo / Tarjeta / Transferencia):**
1. Llama `POST /api/movimientos` con:
   - `tipo: 'ingreso'`
   - `concepto: '{tratamiento_nombre}'`
   - `monto: precio` (si sin precio → abre MovimientoModal en lugar del cobro rápido)
   - `forma_pago: 'efectivo' | 'tarjeta' | 'transferencia'`
   - `cita_id: cita_id`
2. El backend marca `citas.cobrado = true`
3. Al completar: refresca datos

**Botón `✎ Editar`:** abre `MovimientoModal` existente pre-llenado con datos de la cita (monto editable, forma_pago, concepto, `cita_id` incluido).

**Movimientos del día:** ícono `✓` verde para ingresos, `↓` rojo para egresos. Muestra concepto, monto, forma_pago y hora.

**Botón `+ Movimiento`:** abre `MovimientoModal` sin pre-llenado (movimiento manual, sin `cita_id`).

### Modificación: `frontend/src/pages/FinanzasPage.jsx`

- Agregar tab `{ id: 'caja', label: 'Caja', Icon: CreditCard }` como primera pestaña
- Renderizar `<CajaPanel />` cuando `tab === 'caja'`
- Tab "Caja" visible para admin y asistente_general (no solo admin)

### Modificación: `frontend/src/pages/TratamientosPage.jsx`

Cada fila de tratamiento muestra el precio con edición inline:

- Si tiene precio: muestra `$1,800` — al hacer clic se convierte en `<input type="number">`, Enter o blur guarda vía `PATCH /api/tratamientos/:id/precio`
- Si no tiene precio: muestra `— agregar precio —` en gris, clic activa el input
- Solo visible/editable para admin

### Modificación: `frontend/src/api/finanzas.js`

```js
export const getCajaHoy = () =>
  api.get('/caja/hoy').then(r => r.data);
```

### Modificación: `frontend/src/api/tratamientos.js`

```js
export const updatePrecioTratamiento = (id, precio) =>
  api.patch(`/tratamientos/${id}/precio`, { precio }).then(r => r.data);
```

---

## Routing backend

En `backend/src/index.js`:

```js
app.use('/api/caja', authMiddleware, require('./routes/caja'));
```

Archivo nuevo: `backend/src/routes/caja.js`

```js
const router = require('express').Router();
const ctrl   = require('../controllers/cajaController');
router.get('/hoy', ctrl.hoy);
module.exports = router;
```

Archivo nuevo: `backend/src/controllers/cajaController.js` — contiene la lógica del endpoint `hoy`.

La ruta `PATCH /api/tratamientos/:id/precio` se agrega a `backend/src/routes/tratamientos.js`.

---

## Files Created / Modified

| Acción   | Archivo |
|----------|---------|
| Crear    | `backend/src/db/migrations/020_caja.sql` |
| Crear    | `backend/src/controllers/cajaController.js` |
| Crear    | `backend/src/routes/caja.js` |
| Modificar| `backend/src/controllers/tratamientosController.js` (agregar updatePrecio) |
| Modificar| `backend/src/routes/tratamientos.js` (agregar PATCH /:id/precio) |
| Modificar| `backend/src/controllers/movimientosController.js` (manejar cita_id) |
| Modificar| `backend/src/index.js` (registrar /api/caja) |
| Crear    | `frontend/src/components/finanzas/CajaPanel.jsx` |
| Modificar| `frontend/src/pages/FinanzasPage.jsx` (tab Caja) |
| Modificar| `frontend/src/pages/TratamientosPage.jsx` (precio inline) |
| Modificar| `frontend/src/api/finanzas.js` (getCajaHoy) |
| Modificar| `frontend/src/api/tratamientos.js` (updatePrecioTratamiento) |

---

## Constraints

- Sin precio definido → cobro rápido no disponible; botones muestran solo `✎ Editar` (abre modal con monto en blanco)
- `cita_id` en movimiento es opcional — movimientos manuales no tienen cita
- Solo ingresos cuentan en el resumen de caja por forma de pago (los egresos aparecen en la lista pero no suman al total de cobros)
- Tab Caja visible para `admin` y `asistente_general`; el botón "Cerrar corte" solo para `admin`
- Auto-refresh se pausa si el tab no está activo (usar `document.visibilityState`)
