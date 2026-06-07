# Módulo Finanzas — Gioval Medicina Estética

**Fecha:** 2026-06-07  
**Proyecto:** Elys / Gioval Medicina Estética  
**Estado:** Aprobado por usuario

---

## Resumen

Módulo de gestión financiera para la clínica. Registro manual de ingresos y egresos con categorías administrables, corte de caja diario que puede cerrarse como snapshot inmutable, y reportes con gráficas exportables a PDF.

---

## Decisiones de diseño

| Pregunta | Decisión |
|---|---|
| ¿Cómo se registran ingresos? | Manual (monto, concepto, categoría, fecha, forma de pago) |
| ¿Qué son los egresos? | Todo: gastos operativos + nómina |
| ¿Qué es el corte de caja? | Resumen diario (ingresos - egresos = saldo) + snapshot cerrable |
| ¿Categorías fijas o libres? | Predefinidas pero admin puede gestionar (CRUD) |
| ¿Reportes? | Tablas + gráficas + desglose por categoría + exportar PDF |
| ¿Enfoque DB? | Tabla unificada `movimientos` + tabla `cortes_caja` guardados |

---

## Base de datos — Migración 016

### Tabla `categorias_movimiento`

```sql
CREATE TABLE categorias_movimiento (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  tipo       VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'ambos')),
  color      VARCHAR(7)   NOT NULL DEFAULT '#887482',
  activo     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Seed inicial:**
- Ingresos: Tratamiento, Venta producto, Depósito
- Egresos: Nómina, Insumos, Renta, Servicios, Otros
- Ambos: Otros

### Tabla `movimientos`

```sql
CREATE TABLE movimientos (
  id           SERIAL PRIMARY KEY,
  tipo         VARCHAR(10)    NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria_id INTEGER        REFERENCES categorias_movimiento(id) ON DELETE SET NULL,
  concepto     TEXT           NOT NULL,
  monto        DECIMAL(12,2)  NOT NULL CHECK (monto > 0),
  forma_pago   VARCHAR(20)    NOT NULL DEFAULT 'efectivo'
               CHECK (forma_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  fecha        DATE           NOT NULL DEFAULT CURRENT_DATE,
  notas        TEXT,
  created_by   INTEGER        REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
```

### Tabla `cortes_caja`

```sql
CREATE TABLE cortes_caja (
  id               SERIAL PRIMARY KEY,
  fecha            DATE           NOT NULL UNIQUE,
  total_ingresos   DECIMAL(12,2)  NOT NULL,
  total_egresos    DECIMAL(12,2)  NOT NULL,
  saldo            DECIMAL(12,2)  NOT NULL,
  notas            TEXT,
  cerrado_por      INTEGER        REFERENCES usuarios(id) ON DELETE SET NULL,
  cerrado_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
```

**Regla de negocio:** Una vez cerrado un corte, los movimientos de esa fecha quedan bloqueados para edición/eliminación.

---

## API Backend

### Router `/api/categorias-movimiento`

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/` | Listar todas (admin ve inactivas, asistente solo activas) | todos |
| POST | `/` | Crear categoría | admin |
| PUT | `/:id` | Editar nombre/color/activo | admin |
| DELETE | `/:id` | Desactivar si tiene movimientos, eliminar si está vacía | admin |

### Router `/api/movimientos`

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/` | Listar con filtros: `tipo`, `categoria_id`, `fecha_inicio`, `fecha_fin`, `forma_pago` | todos |
| POST | `/` | Registrar movimiento | todos |
| PUT | `/:id` | Editar (bloqueado si corte del día está cerrado) | todos |
| DELETE | `/:id` | Eliminar (bloqueado si corte del día está cerrado) | todos |
| GET | `/resumen` | Totales agrupados por categoría para período dado | todos |

### Router `/api/cortes-caja`

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/` | Historial de cortes cerrados | todos |
| GET | `/hoy` | Calcula corte del día en tiempo real (no guarda) | todos |
| POST | `/cerrar` | Cierra corte de hoy como snapshot inmutable | admin |
| GET | `/:id` | Detalle de corte guardado | todos |

---

## Frontend — `FinanzasPage.jsx` (4 tabs)

### Tab 1 — Movimientos

- Tabla con columnas: fecha, tipo (chip), categoría, concepto, forma de pago, monto
- Filtros superiores: tipo, categoría, forma de pago, rango de fechas
- Botones "Nuevo ingreso" / "Nuevo egreso" → `MovimientoModal`
- Fila: botón editar y eliminar (deshabilitados si corte del día cerrado)

**`MovimientoModal`** (crear/editar):
- Campos: concepto (texto), categoría (select filtrado por tipo), monto, forma de pago, fecha, notas
- Validación: concepto requerido, monto > 0

### Tab 2 — Corte de Caja

- Tarjetas resumen del día: Total Ingresos (verde), Total Egresos (rojo), Saldo Neto (lila)
- Tabla de movimientos del día agrupada por categoría
- Botón "Cerrar corte del día" (solo admin) — modal de confirmación con notas opcionales
- Historial de cortes anteriores como tabla colapsable (fecha, ingresos, egresos, saldo, cerrado por)

### Tab 3 — Reportes

- Selector de período: mes actual, mes anterior, trimestre, rango personalizado
- Gráfica de barras: ingresos vs egresos por mes (Recharts — nueva dependencia)
- Tabla de desglose por categoría con totales del período
- Botón "Exportar PDF" → genera PDF usando `jsPDF` + `html2canvas` (nuevas dependencias)

### Tab 4 — Categorías *(solo admin)*

- Tabla: chip de color, nombre, tipo (ingreso/egreso/ambos), toggle activo/inactivo
- Botón "Nueva categoría" → `CategoriaModal` (nombre, tipo, color picker simple)
- Botón editar por fila

---

## Dependencias nuevas (frontend)

```bash
npm install recharts jspdf html2canvas
```

---

## Archivos a crear/modificar

### Backend
- `src/db/migrations/016_finanzas.sql` — las 3 tablas + seed de categorías
- `src/models/finanzas.js` — queries para movimientos, categorías y cortes
- `src/controllers/finanzas.js` — lógica de negocio (validar corte cerrado, calcular resumen)
- `src/routes/finanzas.js` — los 3 routers exportados juntos
- `src/index.js` — registrar rutas `/api/categorias-movimiento`, `/api/movimientos`, `/api/cortes-caja`
- `src/db/migrate.js` — asegurar que corre migración 016

### Frontend
- `src/pages/FinanzasPage.jsx` — reemplazar placeholder con página de 4 tabs
- `src/components/finanzas/MovimientoModal.jsx`
- `src/components/finanzas/CategoriaModal.jsx`
- `src/components/finanzas/CorteResumen.jsx`
- `src/components/finanzas/ReportesFinanzas.jsx`

---

## Branding

Paleta existente del proyecto:
- `#cccad8` lavanda (nav), `#aba3ba` lila (botones), `#887482` malva (texto)
- `#ced1ca` sage (bordes), `#f5f2f0` crema (fondo)
- Ingresos: verde `#4a7c6a` (ya usado en dashboard)
- Egresos: rojo suave `#c0675a`
- Saldo positivo: verde, negativo: rojo

---

## Restricciones y reglas de negocio

1. Un corte de caja solo puede cerrarse una vez por día (UNIQUE en fecha)
2. Una vez cerrado, los movimientos de esa fecha quedan inmutables (backend valida)
3. Solo admin puede cerrar cortes y gestionar categorías
4. Asistente puede crear/ver movimientos pero no cerrar corte ni editar categorías
5. No se puede eliminar una categoría con movimientos asociados (solo desactivar)
6. `monto` siempre positivo — el campo `tipo` determina si suma o resta
