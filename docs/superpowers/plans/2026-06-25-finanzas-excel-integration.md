# Finanzas Excel Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar las 11 hojas del archivo FINANZAS GIOVAL.xlsx al módulo de finanzas de la web app: Estado de Resultados, Dashboard KPIs, Catálogo de Insumos, Kits por Tratamiento, Nómina mensual, Cuentas por Pagar, y enriquecer la Caja con costo_cabina + margen.

**Architecture:** Migration 030 ya creó las tablas `insumos`, `kits_insumos`, `kit_insumo_items`, `tratamiento_kit` con datos reales del Excel. Este plan agrega: (1) endpoints backend para ER/KPIs/insumos/kits/nómina/cxp, (2) migration 031 para las dos tablas faltantes, (3) componentes frontend en FinanzasPage con tabs nuevas, (4) enriquecimiento de CajaPanel con costo_cabina y margen.

**Tech Stack:** Node.js + Express (backend), React 19 + Vite (frontend), PostgreSQL 16, Tailwind CSS v4.

## Global Constraints

- Backend: Node.js 20, Express 5, PostgreSQL pool en `backend/src/db/pool.js`
- Auth middleware: `authMiddleware` ya registrado, usar en todas las rutas
- Solo admin: usar `if (req.user.rol !== 'admin') return res.status(403)...`
- Migraciones: archivos `.sql` en `backend/src/db/migrations/`, auto-aplicadas al arrancar
- Siguiente migración disponible: **031**
- Frontend: Tailwind v4 (no `@apply`, usar clases utilitarias inline)
- Colores Gioval: lavanda `#cccad8`, lila `#aba3ba`, malva `#887482`, sage `#ced1ca`, crema `#f5f2f0`
- `fmt` helper para moneda ya existe en FinanzasPage: `n => \`$\${parseFloat(n||0).toLocaleString('es-MX',{minimumFractionDigits:2})}\``
- API frontend base: `import api from '../api/client'` (axios instance con auth header)
- Tabs en FinanzasPage: objeto TABS array, rol-gated con `soloAdmin: true` o `roles: [...]`

---

## File Map

**Backend — new/modified:**
- Create: `backend/src/models/insumos.js`
- Create: `backend/src/controllers/insumosController.js`
- Create: `backend/src/routes/insumos.js`
- Create: `backend/src/models/nomina.js`
- Create: `backend/src/controllers/nominaController.js`
- Create: `backend/src/routes/nomina.js`
- Create: `backend/src/models/cuentasPorPagar.js`
- Create: `backend/src/controllers/cuentasPorPagarController.js`
- Create: `backend/src/routes/cuentas-por-pagar.js`
- Create: `backend/src/db/migrations/031_nomina_cuentas_por_pagar.sql`
- Modify: `backend/src/models/finanzas.js` (add estadoResultados, dashboardKPIs)
- Modify: `backend/src/controllers/finanzas.js` (add 2 handlers)
- Modify: `backend/src/routes/finanzas.js` (add 2 GET routes)
- Modify: `backend/src/controllers/cajaController.js` (add costo_cabina to pendientes)
- Modify: `backend/src/index.js` (mount 3 new route groups)

**Frontend — new/modified:**
- Create: `frontend/src/api/insumos.js`
- Create: `frontend/src/api/nomina.js`
- Create: `frontend/src/api/cuentasPorPagar.js`
- Create: `frontend/src/components/finanzas/DashboardKPIs.jsx`
- Create: `frontend/src/components/finanzas/EstadoResultados.jsx`
- Create: `frontend/src/components/finanzas/InsumosTab.jsx`
- Create: `frontend/src/components/finanzas/KitsTab.jsx`
- Create: `frontend/src/components/finanzas/NominaTab.jsx`
- Create: `frontend/src/components/finanzas/CuentasXPagarTab.jsx`
- Modify: `frontend/src/api/finanzas.js` (add getDashboard, getEstadoResultados)
- Modify: `frontend/src/components/finanzas/CajaPanel.jsx` (show costo_cabina + margen)
- Modify: `frontend/src/pages/FinanzasPage.jsx` (add 7 new tabs)

---

### Task 1: Backend — Estado de Resultados + Dashboard KPIs endpoints

**Dependencies:** None (lee tablas existentes: movimientos, citas, categorias_movimiento)

**Files:**
- Modify: `backend/src/models/finanzas.js`
- Modify: `backend/src/controllers/finanzas.js`
- Modify: `backend/src/routes/finanzas.js`

**Interfaces:**
- Produces: `GET /api/finanzas/estado-resultados?mes=YYYY-MM` → `{ mes, ingresos_brutos, iva_estimado, ingresos_netos, costo_materiales, utilidad_bruta, costos_fijos, nomina_total, utilidad_operativa, servicios_realizados, ticket_promedio, margen_bruto, margen_neto }`
- Produces: `GET /api/finanzas/dashboard?mes=YYYY-MM` → `{ ingresos_netos, total_egresos, utilidad_bruta, ticket_promedio, servicios_realizados, margen_bruto, nomina_total, costo_materiales, ingresos_brutos }`

- [ ] **Step 1: Add models to finanzas.js**

Append to the bottom of `backend/src/models/finanzas.js` (before `module.exports`):

```javascript
const Reportes = {
  async estadoResultados(mes) {
    // mes = 'YYYY-MM'
    const pool = require('../db/pool');

    const movQ = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END), 0)::numeric AS ingresos_brutos,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' AND c.nombre = 'Insumos' THEN m.monto ELSE 0 END), 0)::numeric AS costo_materiales,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' AND c.nombre = 'Nómina'  THEN m.monto ELSE 0 END), 0)::numeric AS nomina_total,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' AND c.nombre IN ('Renta','Servicios') THEN m.monto ELSE 0 END), 0)::numeric AS costos_fijos,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END), 0)::numeric AS total_egresos
      FROM movimientos m
      LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
      WHERE TO_CHAR(m.fecha, 'YYYY-MM') = $1
    `, [mes]);

    const citasQ = await pool.query(`
      SELECT COUNT(*)::integer AS servicios_realizados
      FROM citas
      WHERE estatus = 'realizada' AND TO_CHAR(fecha_hora, 'YYYY-MM') = $1
    `, [mes]);

    const r = movQ.rows[0];
    const ingresos_brutos    = parseFloat(r.ingresos_brutos);
    const costo_materiales   = parseFloat(r.costo_materiales);
    const nomina_total       = parseFloat(r.nomina_total);
    const costos_fijos       = parseFloat(r.costos_fijos);
    const total_egresos      = parseFloat(r.total_egresos);
    const iva_estimado       = +(ingresos_brutos * 0.16).toFixed(2);
    const ingresos_netos     = +(ingresos_brutos - iva_estimado).toFixed(2);
    const utilidad_bruta     = +(ingresos_netos - costo_materiales).toFixed(2);
    const utilidad_operativa = +(utilidad_bruta - costos_fijos - nomina_total).toFixed(2);
    const servicios          = citasQ.rows[0].servicios_realizados;
    const ticket_promedio    = servicios > 0 ? +(ingresos_brutos / servicios).toFixed(2) : 0;
    const margen_bruto       = ingresos_netos > 0 ? +((utilidad_bruta / ingresos_netos) * 100).toFixed(1) : 0;
    const margen_neto        = ingresos_netos > 0 ? +((utilidad_operativa / ingresos_netos) * 100).toFixed(1) : 0;

    return {
      mes,
      ingresos_brutos, iva_estimado, ingresos_netos,
      costo_materiales, utilidad_bruta,
      costos_fijos, nomina_total, utilidad_operativa,
      total_egresos,
      servicios_realizados: servicios,
      ticket_promedio, margen_bruto, margen_neto,
    };
  },

  async dashboardKPIs(mes) {
    const er = await Reportes.estadoResultados(mes);
    return {
      ingresos_netos:       er.ingresos_netos,
      total_egresos:        er.total_egresos,
      utilidad_bruta:       er.utilidad_bruta,
      ticket_promedio:      er.ticket_promedio,
      servicios_realizados: er.servicios_realizados,
      margen_bruto:         er.margen_bruto,
      nomina_total:         er.nomina_total,
      costo_materiales:     er.costo_materiales,
      ingresos_brutos:      er.ingresos_brutos,
    };
  },
};
```

Update the `module.exports` line at the bottom of the file:

```javascript
module.exports = { Categoria, Movimiento, CorteCaja, Reportes };
```

- [ ] **Step 2: Add controller handlers to finanzas.js**

Append to `backend/src/controllers/finanzas.js`:

```javascript
// ── Reportes avanzados ────────────────────────────────────────────────────────
const { Reportes } = require('../models/finanzas');

exports.estadoResultados = async (req, res, next) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    res.json(await Reportes.estadoResultados(mes));
  } catch (err) { next(err); }
};

exports.dashboardKPIs = async (req, res, next) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    res.json(await Reportes.dashboardKPIs(mes));
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Add routes to finanzas.js routes file**

In `backend/src/routes/finanzas.js`, add a new `reportes` router and export it:

```javascript
const reportes = Router();
reportes.get('/estado-resultados', ctrl.estadoResultados);
reportes.get('/dashboard',         ctrl.dashboardKPIs);

module.exports = { categorias, movimientos, cortes, reportes };
```

- [ ] **Step 4: Mount in index.js**

In `backend/src/index.js`, find the existing finanzas block and add one line:

```javascript
app.use('/api/finanzas', authMiddleware, finanzas.reportes);
```

- [ ] **Step 5: Manual test**

Start backend locally (`cd ~/elys/backend && npm run dev`) and run:
```bash
curl -s -H "Authorization: Bearer <token>" \
  "http://localhost:3008/api/finanzas/dashboard?mes=2026-06" | jq .
```
Expected: JSON with 9 numeric keys (all zeros since no data for June yet — but no 500 error).

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add backend/src/models/finanzas.js backend/src/controllers/finanzas.js backend/src/routes/finanzas.js backend/src/index.js
git commit -m "feat(finanzas): add Estado de Resultados and Dashboard KPIs endpoints"
```

---

### Task 2: Backend — Insumos + Kits CRUD

**Dependencies:** Migration 030 already applied (tables exist, data seeded)

**Files:**
- Create: `backend/src/models/insumos.js`
- Create: `backend/src/controllers/insumosController.js`
- Create: `backend/src/routes/insumos.js`
- Modify: `backend/src/index.js`

**Interfaces:**
- Produces: `GET /api/insumos` → `[{ id, codigo, nombre, proveedor, presentacion, precio_unitario, costo_unidad, stock_minimo, stock_actual, categoria, activo }]`
- Produces: `PUT /api/insumos/:id` → updated insumo (admin only)
- Produces: `GET /api/kits` → `[{ id, nombre, activo, costo_cabina, items: [{insumo_id, nombre, cantidad, unidad, costo_sesion}] }]`
- Produces: `GET /api/kits/:id/costo` → `{ kit_id, costo_cabina }`
- Produces: `GET /api/tratamientos/:id/costo-cabina` → `{ tratamiento_id, kit_id, kit_nombre, costo_cabina }`

- [ ] **Step 1: Create model**

Create `backend/src/models/insumos.js`:

```javascript
const pool = require('../db/pool');

const Insumo = {
  async list() {
    const { rows } = await pool.query(
      `SELECT * FROM insumos ORDER BY categoria, nombre`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM insumos WHERE id = $1', [id]);
    return rows[0];
  },

  async update(id, { nombre, proveedor, presentacion, precio_unitario, costo_unidad, stock_minimo, stock_actual, categoria, activo }) {
    const { rows } = await pool.query(
      `UPDATE insumos SET
         nombre          = COALESCE($1, nombre),
         proveedor       = COALESCE($2, proveedor),
         presentacion    = COALESCE($3, presentacion),
         precio_unitario = COALESCE($4, precio_unitario),
         costo_unidad    = COALESCE($5, costo_unidad),
         stock_minimo    = COALESCE($6, stock_minimo),
         stock_actual    = COALESCE($7, stock_actual),
         categoria       = COALESCE($8, categoria),
         activo          = COALESCE($9, activo),
         actualizado_en  = NOW()
       WHERE id = $10 RETURNING *`,
      [nombre ?? null, proveedor ?? null, presentacion ?? null,
       precio_unitario ?? null, costo_unidad ?? null,
       stock_minimo ?? null, stock_actual ?? null,
       categoria ?? null, activo ?? null, id]
    );
    return rows[0];
  },

  async categorias() {
    const { rows } = await pool.query(
      `SELECT DISTINCT categoria FROM insumos WHERE activo = true ORDER BY categoria`
    );
    return rows.map(r => r.categoria);
  },
};

const Kit = {
  async list() {
    const { rows } = await pool.query(`
      SELECT k.id, k.nombre, k.activo,
             COALESCE(SUM(kii.cantidad * i.costo_unidad), 0)::numeric AS costo_cabina
      FROM kits_insumos k
      LEFT JOIN kit_insumo_items kii ON kii.kit_id = k.id
      LEFT JOIN insumos i ON i.id = kii.insumo_id
      GROUP BY k.id, k.nombre, k.activo
      ORDER BY k.nombre
    `);
    return rows;
  },

  async findByIdWithItems(id) {
    const { rows: kit } = await pool.query(
      'SELECT * FROM kits_insumos WHERE id = $1', [id]
    );
    if (!kit[0]) return null;

    const { rows: items } = await pool.query(`
      SELECT kii.id, kii.insumo_id, i.codigo, i.nombre, kii.cantidad, kii.unidad,
             (kii.cantidad * i.costo_unidad)::numeric AS costo_sesion
      FROM kit_insumo_items kii
      JOIN insumos i ON i.id = kii.insumo_id
      WHERE kii.kit_id = $1
      ORDER BY i.categoria, i.nombre
    `, [id]);

    const costo_cabina = items.reduce((s, it) => s + parseFloat(it.costo_sesion), 0);
    return { ...kit[0], items, costo_cabina: +costo_cabina.toFixed(4) };
  },

  async costoCabina(kitId) {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(kii.cantidad * i.costo_unidad), 0)::numeric AS costo_cabina
      FROM kit_insumo_items kii
      JOIN insumos i ON i.id = kii.insumo_id
      WHERE kii.kit_id = $1
    `, [kitId]);
    return parseFloat(rows[0].costo_cabina);
  },

  async costoByTratamiento(tratamientoId) {
    const { rows } = await pool.query(`
      SELECT tk.kit_id, k.nombre AS kit_nombre,
             COALESCE(SUM(kii.cantidad * i.costo_unidad), 0)::numeric AS costo_cabina
      FROM tratamiento_kit tk
      JOIN kits_insumos k ON k.id = tk.kit_id
      LEFT JOIN kit_insumo_items kii ON kii.kit_id = tk.kit_id
      LEFT JOIN insumos i ON i.id = kii.insumo_id
      WHERE tk.tratamiento_id = $1
      GROUP BY tk.kit_id, k.nombre
    `, [tratamientoId]);
    return rows[0] || null;
  },

  async updateItem(itemId, { cantidad }) {
    const { rows } = await pool.query(
      `UPDATE kit_insumo_items SET cantidad = $1 WHERE id = $2 RETURNING *`,
      [cantidad, itemId]
    );
    return rows[0];
  },
};

module.exports = { Insumo, Kit };
```

- [ ] **Step 2: Create controller**

Create `backend/src/controllers/insumosController.js`:

```javascript
const { Insumo, Kit } = require('../models/insumos');

// ── Insumos ───────────────────────────────────────────────────────────────────

exports.listInsumos = async (req, res, next) => {
  try { res.json(await Insumo.list()); } catch (err) { next(err); }
};

exports.updateInsumo = async (req, res, next) => {
  try {
    const insumo = await Insumo.update(req.params.id, req.body);
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(insumo);
  } catch (err) { next(err); }
};

exports.categoriasInsumos = async (req, res, next) => {
  try { res.json(await Insumo.categorias()); } catch (err) { next(err); }
};

// ── Kits ──────────────────────────────────────────────────────────────────────

exports.listKits = async (req, res, next) => {
  try { res.json(await Kit.list()); } catch (err) { next(err); }
};

exports.getKit = async (req, res, next) => {
  try {
    const kit = await Kit.findByIdWithItems(req.params.id);
    if (!kit) return res.status(404).json({ error: 'Kit no encontrado' });
    res.json(kit);
  } catch (err) { next(err); }
};

exports.costoKit = async (req, res, next) => {
  try {
    const costo = await Kit.costoCabina(req.params.id);
    res.json({ kit_id: parseInt(req.params.id), costo_cabina: costo });
  } catch (err) { next(err); }
};

exports.costoCabinaByTratamiento = async (req, res, next) => {
  try {
    const info = await Kit.costoByTratamiento(req.params.id);
    res.json(info ? { tratamiento_id: parseInt(req.params.id), ...info } : { tratamiento_id: parseInt(req.params.id), costo_cabina: 0, kit_id: null, kit_nombre: null });
  } catch (err) { next(err); }
};

exports.updateKitItem = async (req, res, next) => {
  try {
    const item = await Kit.updateItem(req.params.itemId, req.body);
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    res.json(item);
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Create routes**

Create `backend/src/routes/insumos.js`:

```javascript
const { Router } = require('express');
const ctrl = require('../controllers/insumosController');

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const insumosRouter = Router();
insumosRouter.get('/categorias', ctrl.categoriasInsumos);
insumosRouter.get('/',     ctrl.listInsumos);
insumosRouter.put('/:id',  soloAdmin, ctrl.updateInsumo);

const kitsRouter = Router();
kitsRouter.get('/',                ctrl.listKits);
kitsRouter.get('/:id',             ctrl.getKit);
kitsRouter.get('/:id/costo',       ctrl.costoKit);
kitsRouter.put('/:id/items/:itemId', soloAdmin, ctrl.updateKitItem);

const tratamientoKitRouter = Router();
tratamientoKitRouter.get('/:id/costo-cabina', ctrl.costoCabinaByTratamiento);

module.exports = { insumosRouter, kitsRouter, tratamientoKitRouter };
```

- [ ] **Step 4: Mount in index.js**

In `backend/src/index.js`, find the existing routes block and add:

```javascript
const { insumosRouter, kitsRouter, tratamientoKitRouter } = require('./routes/insumos');
// ...
app.use('/api/insumos',      authMiddleware, insumosRouter);
app.use('/api/kits',         authMiddleware, kitsRouter);
app.use('/api/tratamientos', authMiddleware, tratamientoKitRouter);
```

Note: `app.use('/api/tratamientos', ...)` will be additive — Express matches the most specific path, so `/api/tratamientos/:id/costo-cabina` won't conflict with the existing `/api/tratamientos` CRUD routes IF the existing routes are mounted separately. Verify `index.js` mounts tratamientos as its own router; if so, add the tratamientoKitRouter mount **before** the existing tratamientos mount.

- [ ] **Step 5: Manual test**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3008/api/kits | jq '.[0]'
```
Expected: `{ "id": 1, "nombre": "LIMPIEZA FACIAL PROFUNDA", "costo_cabina": "..." }`

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3008/api/insumos | jq 'length'
```
Expected: `92`

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add backend/src/models/insumos.js backend/src/controllers/insumosController.js backend/src/routes/insumos.js backend/src/index.js
git commit -m "feat(insumos): add CRUD endpoints for insumos and kits"
```

---

### Task 3: Migration 031 + Nómina + Cuentas x Pagar backend

**Dependencies:** None (new tables)

**Files:**
- Create: `backend/src/db/migrations/031_nomina_cuentas_por_pagar.sql`
- Create: `backend/src/models/nomina.js`
- Create: `backend/src/models/cuentasPorPagar.js`
- Create: `backend/src/controllers/nominaController.js`
- Create: `backend/src/controllers/cuentasPorPagarController.js`
- Create: `backend/src/routes/nomina.js`
- Create: `backend/src/routes/cuentas-por-pagar.js`
- Modify: `backend/src/index.js`

**Interfaces:**
- Produces: `GET /api/nomina?mes=YYYY-MM` → `[{ id, mes, empleado_id, nombre_rol, sueldo_base, comision, bono, rfc, nss, observaciones }]`
- Produces: `POST /api/nomina` body: `{ mes, nombre_rol, sueldo_base, comision?, bono?, empleado_id?, rfc?, nss?, observaciones? }` → created row
- Produces: `PUT /api/nomina/:id` → updated row
- Produces: `DELETE /api/nomina/:id` → `{ mensaje }`
- Produces: `GET /api/cuentas-por-pagar` query: `?estatus=pendiente|parcial|liquidada` → `[{ id, folio_factura, proveedor_nombre, concepto, fecha_factura, fecha_vencimiento, importe_total, pagado, saldo_pendiente, estatus, forma_pago, observaciones }]`
- Produces: `POST /api/cuentas-por-pagar` → created row
- Produces: `PUT /api/cuentas-por-pagar/:id` → updated row
- Produces: `DELETE /api/cuentas-por-pagar/:id` → `{ mensaje }`

- [ ] **Step 1: Create migration**

Create `backend/src/db/migrations/031_nomina_cuentas_por_pagar.sql`:

```sql
-- Migration 031: Nómina mensual y Cuentas por Pagar

CREATE TABLE IF NOT EXISTS nomina_mensual (
  id            SERIAL PRIMARY KEY,
  mes           VARCHAR(7)    NOT NULL,
  empleado_id   INTEGER       REFERENCES empleados(id) ON DELETE SET NULL,
  nombre_rol    VARCHAR(100)  NOT NULL,
  sueldo_base   NUMERIC(10,2) NOT NULL DEFAULT 0,
  comision      NUMERIC(10,2) NOT NULL DEFAULT 0,
  bono          NUMERIC(10,2) NOT NULL DEFAULT 0,
  rfc           VARCHAR(20),
  nss           VARCHAR(20),
  observaciones TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomina_mes ON nomina_mensual(mes);

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
  id                SERIAL PRIMARY KEY,
  folio_factura     VARCHAR(50),
  proveedor_id      INTEGER       REFERENCES farmacia_proveedores(id) ON DELETE SET NULL,
  proveedor_nombre  VARCHAR(150),
  concepto          TEXT          NOT NULL,
  fecha_factura     DATE,
  fecha_vencimiento DATE,
  importe_total     NUMERIC(10,2) NOT NULL,
  pagado            NUMERIC(10,2) NOT NULL DEFAULT 0,
  estatus           VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                    CHECK (estatus IN ('pendiente','parcial','liquidada')),
  forma_pago        VARCHAR(20),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cxp_estatus ON cuentas_por_pagar(estatus);
CREATE INDEX IF NOT EXISTS idx_cxp_vencimiento ON cuentas_por_pagar(fecha_vencimiento);
```

- [ ] **Step 2: Create nomina model**

Create `backend/src/models/nomina.js`:

```javascript
const pool = require('../db/pool');

const Nomina = {
  async list(mes) {
    const where = mes ? 'WHERE n.mes = $1' : '';
    const vals  = mes ? [mes] : [];
    const { rows } = await pool.query(
      `SELECT n.*,
              (n.sueldo_base + n.comision + n.bono)::numeric AS total_empleado,
              (n.sueldo_base * 0.25)::numeric AS costo_imss_infonavit,
              (n.sueldo_base + n.comision + n.bono + n.sueldo_base * 0.25)::numeric AS costo_total_empresa,
              e.nombre AS empleado_nombre
       FROM nomina_mensual n
       LEFT JOIN empleados e ON e.id = n.empleado_id
       ${where}
       ORDER BY n.mes DESC, n.nombre_rol`,
      vals
    );
    return rows;
  },

  async create({ mes, empleado_id, nombre_rol, sueldo_base, comision, bono, rfc, nss, observaciones }) {
    const { rows } = await pool.query(
      `INSERT INTO nomina_mensual (mes, empleado_id, nombre_rol, sueldo_base, comision, bono, rfc, nss, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [mes, empleado_id || null, nombre_rol, sueldo_base || 0,
       comision || 0, bono || 0, rfc || null, nss || null, observaciones || null]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['nombre_rol','sueldo_base','comision','bono','rfc','nss','observaciones','empleado_id'];
    const sets = []; const vals = []; let i = 1;
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(fields[k]); }
    }
    if (!sets.length) return await Nomina.list(null).then(r => r.find(x => x.id == id));
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE nomina_mensual SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM nomina_mensual WHERE id = $1', [id]);
  },

  async resumenMes(mes) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(sueldo_base + comision + bono), 0)::numeric AS total_bruto,
         COALESCE(SUM(sueldo_base * 0.25), 0)::numeric AS total_cargas_sociales,
         COALESCE(SUM(sueldo_base + comision + bono + sueldo_base * 0.25), 0)::numeric AS costo_total_empresa,
         COUNT(*)::integer AS empleados
       FROM nomina_mensual WHERE mes = $1`,
      [mes]
    );
    return rows[0];
  },
};

module.exports = { Nomina };
```

- [ ] **Step 3: Create cuentas_por_pagar model**

Create `backend/src/models/cuentasPorPagar.js`:

```javascript
const pool = require('../db/pool');

const CuentaPorPagar = {
  async list({ estatus } = {}) {
    const where = estatus ? 'WHERE c.estatus = $1' : '';
    const vals  = estatus ? [estatus] : [];
    const { rows } = await pool.query(
      `SELECT c.*,
              (c.importe_total - c.pagado)::numeric AS saldo_pendiente,
              fp.nombre AS proveedor_real
       FROM cuentas_por_pagar c
       LEFT JOIN farmacia_proveedores fp ON fp.id = c.proveedor_id
       ${where}
       ORDER BY c.estatus, c.fecha_vencimiento ASC NULLS LAST`,
      vals
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM cuentas_por_pagar WHERE id = $1', [id]);
    return rows[0];
  },

  async create({ folio_factura, proveedor_id, proveedor_nombre, concepto, fecha_factura, fecha_vencimiento, importe_total, pagado, estatus, forma_pago, observaciones }) {
    const { rows } = await pool.query(
      `INSERT INTO cuentas_por_pagar
         (folio_factura, proveedor_id, proveedor_nombre, concepto, fecha_factura, fecha_vencimiento, importe_total, pagado, estatus, forma_pago, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [folio_factura || null, proveedor_id || null, proveedor_nombre || null,
       concepto, fecha_factura || null, fecha_vencimiento || null,
       importe_total, pagado || 0,
       estatus || 'pendiente', forma_pago || null, observaciones || null]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowed = ['folio_factura','proveedor_id','proveedor_nombre','concepto','fecha_factura','fecha_vencimiento','importe_total','pagado','estatus','forma_pago','observaciones'];
    const sets = []; const vals = []; let i = 1;
    for (const k of allowed) {
      if (fields[k] !== undefined) { sets.push(`${k} = $${i++}`); vals.push(fields[k]); }
    }
    if (sets.length) { sets.push(`updated_at = NOW()`); }
    if (!sets.length) return await CuentaPorPagar.findById(id);
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE cuentas_por_pagar SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM cuentas_por_pagar WHERE id = $1', [id]);
  },

  async resumen() {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN estatus != 'liquidada' THEN importe_total - pagado ELSE 0 END), 0)::numeric AS total_pendiente,
        COUNT(CASE WHEN estatus = 'pendiente' THEN 1 END)::integer AS count_pendiente,
        COUNT(CASE WHEN estatus = 'parcial'   THEN 1 END)::integer AS count_parcial,
        COUNT(CASE WHEN estatus = 'liquidada' THEN 1 END)::integer AS count_liquidada,
        COUNT(CASE WHEN fecha_vencimiento < CURRENT_DATE AND estatus != 'liquidada' THEN 1 END)::integer AS count_vencidas
      FROM cuentas_por_pagar
    `);
    return rows[0];
  },
};

module.exports = { CuentaPorPagar };
```

- [ ] **Step 4: Create nomina controller**

Create `backend/src/controllers/nominaController.js`:

```javascript
const { Nomina } = require('../models/nomina');

exports.list = async (req, res, next) => {
  try { res.json(await Nomina.list(req.query.mes || null)); } catch (err) { next(err); }
};

exports.resumen = async (req, res, next) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    res.json(await Nomina.resumenMes(mes));
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { mes, nombre_rol, sueldo_base } = req.body;
    if (!mes || !nombre_rol) return res.status(400).json({ error: 'mes y nombre_rol son requeridos' });
    res.status(201).json(await Nomina.create(req.body));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const row = await Nomina.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Nomina.delete(req.params.id);
    res.json({ mensaje: 'Eliminado' });
  } catch (err) { next(err); }
};
```

- [ ] **Step 5: Create cuentas_por_pagar controller**

Create `backend/src/controllers/cuentasPorPagarController.js`:

```javascript
const { CuentaPorPagar } = require('../models/cuentasPorPagar');

exports.list = async (req, res, next) => {
  try { res.json(await CuentaPorPagar.list({ estatus: req.query.estatus })); } catch (err) { next(err); }
};

exports.resumen = async (req, res, next) => {
  try { res.json(await CuentaPorPagar.resumen()); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    if (!req.body.concepto || !req.body.importe_total)
      return res.status(400).json({ error: 'concepto e importe_total son requeridos' });
    res.status(201).json(await CuentaPorPagar.create(req.body));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const row = await CuentaPorPagar.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const row = await CuentaPorPagar.findById(req.params.id);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    await CuentaPorPagar.delete(req.params.id);
    res.json({ mensaje: 'Eliminado' });
  } catch (err) { next(err); }
};
```

- [ ] **Step 6: Create routes**

Create `backend/src/routes/nomina.js`:

```javascript
const { Router } = require('express');
const ctrl = require('../controllers/nominaController');

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const router = Router();
router.get('/resumen', soloAdmin, ctrl.resumen);
router.get('/',        soloAdmin, ctrl.list);
router.post('/',       soloAdmin, ctrl.create);
router.put('/:id',     soloAdmin, ctrl.update);
router.delete('/:id',  soloAdmin, ctrl.remove);

module.exports = router;
```

Create `backend/src/routes/cuentas-por-pagar.js`:

```javascript
const { Router } = require('express');
const ctrl = require('../controllers/cuentasPorPagarController');

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

const router = Router();
router.get('/resumen', soloAdmin, ctrl.resumen);
router.get('/',        soloAdmin, ctrl.list);
router.post('/',       soloAdmin, ctrl.create);
router.put('/:id',     soloAdmin, ctrl.update);
router.delete('/:id',  soloAdmin, ctrl.remove);

module.exports = router;
```

- [ ] **Step 7: Mount in index.js**

```javascript
const nominaRouter        = require('./routes/nomina');
const cuentasPorPagarRouter = require('./routes/cuentas-por-pagar');
// ...
app.use('/api/nomina',           authMiddleware, nominaRouter);
app.use('/api/cuentas-por-pagar', authMiddleware, cuentasPorPagarRouter);
```

- [ ] **Step 8: Manual test (after restarting backend — migration 031 applies on boot)**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3008/api/nomina/resumen?mes=2026-06 | jq .
```
Expected: `{ "total_bruto": "0.00", "total_cargas_sociales": "0.00", ... }`

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3008/api/cuentas-por-pagar/resumen | jq .
```
Expected: `{ "total_pendiente": "0.00", "count_pendiente": 0, ... }`

- [ ] **Step 9: Commit**

```bash
cd ~/elys
git add backend/src/db/migrations/031_nomina_cuentas_por_pagar.sql \
        backend/src/models/nomina.js backend/src/models/cuentasPorPagar.js \
        backend/src/controllers/nominaController.js backend/src/controllers/cuentasPorPagarController.js \
        backend/src/routes/nomina.js backend/src/routes/cuentas-por-pagar.js \
        backend/src/index.js
git commit -m "feat(nomina,cxp): add migration 031, Nómina and Cuentas x Pagar backend"
```

---

### Task 4: CajaPanel enriched with costo_cabina + margen

**Dependencies:** Task 2 (insumos/kits tables exist and seeded)

**Files:**
- Modify: `backend/src/controllers/cajaController.js`
- Modify: `frontend/src/components/finanzas/CajaPanel.jsx`

**Interfaces:**
- Consumes: existing `GET /api/caja/hoy` response shape `{ resumen, pendientes, movimientos }`
- Produces: each item in `pendientes` gains `costo_cabina` (numeric) field
- Produces: CajaPanel shows "Margen: XX%" next to each pending cita price

- [ ] **Step 1: Update cajaController.hoy query**

In `backend/src/controllers/cajaController.js`, replace the `pendientesQ` query with:

```javascript
    const pendientesQ = await pool.query(`
      SELECT c.id AS cita_id,
             TRIM(COALESCE(
               NULLIF(CONCAT_WS(' ',
                 NULLIF(p.apellido_paterno,''), NULLIF(p.apellido_materno,''), NULLIF(p.nombre,'')), ''),
               c.nombre_paciente
             )) AS paciente_nombre,
             t.nombre AS tratamiento_nombre,
             t.precio,
             c.fecha_hora,
             COALESCE(cabina.costo_cabina, 0)::numeric AS costo_cabina
      FROM citas c
      LEFT JOIN pacientes p    ON c.paciente_id    = p.id
      LEFT JOIN tratamientos t ON c.tratamiento_id = t.id
      LEFT JOIN tratamiento_kit tk ON tk.tratamiento_id = t.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(kii.cantidad * i.costo_unidad), 0) AS costo_cabina
        FROM kit_insumo_items kii
        JOIN insumos i ON i.id = kii.insumo_id
        WHERE kii.kit_id = tk.kit_id
      ) cabina ON true
      WHERE c.estatus = 'realizada'
        AND c.cobrado = false
        AND DATE(c.fecha_hora) = $1
      ORDER BY c.fecha_hora
    `, [hoy]);
```

- [ ] **Step 2: Update CajaPanel.jsx to show costo_cabina + margen**

In `frontend/src/components/finanzas/CajaPanel.jsx`, find the section that renders each pending cita card. After the price display, add the margin calculation. Locate where `cita.precio` is shown and add:

```jsx
{/* inside the cita card, after the price badge */}
{cita.costo_cabina > 0 && cita.precio && (
  <span className="text-xs text-gray-400 ml-2">
    Cabina: ${parseFloat(cita.costo_cabina).toFixed(0)} | Margen:{' '}
    <span className={
      ((cita.precio - cita.costo_cabina) / cita.precio * 100) >= 50
        ? 'text-green-400' : 'text-yellow-400'
    }>
      {Math.round((cita.precio - cita.costo_cabina) / cita.precio * 100)}%
    </span>
  </span>
)}
```

- [ ] **Step 3: Manual test**

Start backend + frontend. Go to `/finanzas` → tab Caja. Any cita realizada with a treatment that has a kit should now show "Cabina: $XX | Margen: YY%".

- [ ] **Step 4: Commit**

```bash
cd ~/elys
git add backend/src/controllers/cajaController.js \
        frontend/src/components/finanzas/CajaPanel.jsx
git commit -m "feat(caja): show costo_cabina and margin per pending cita"
```

---

### Task 5: Frontend API + DashboardKPIs + EstadoResultados tabs

**Dependencies:** Task 1 must be done first

**Files:**
- Modify: `frontend/src/api/finanzas.js`
- Create: `frontend/src/components/finanzas/DashboardKPIs.jsx`
- Create: `frontend/src/components/finanzas/EstadoResultados.jsx`
- Modify: `frontend/src/pages/FinanzasPage.jsx`

- [ ] **Step 1: Add API functions to finanzas.js**

Append to `frontend/src/api/finanzas.js`:

```javascript
export const getDashboardKPIs    = (mes) => api.get('/finanzas/dashboard', { params: { mes } }).then(r => r.data);
export const getEstadoResultados = (mes) => api.get('/finanzas/estado-resultados', { params: { mes } }).then(r => r.data);
```

- [ ] **Step 2: Create DashboardKPIs.jsx**

Create `frontend/src/components/finanzas/DashboardKPIs.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart2, Wallet, ShoppingBag, Percent } from 'lucide-react';
import { getDashboardKPIs } from '../../api/finanzas';

const fmt  = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtP = n => `${parseFloat(n || 0).toFixed(1)}%`;

const KPI_CONFIG = [
  { key: 'ingresos_netos',       label: 'Ingresos Netos',       Icon: DollarSign,   color: '#4a7c6a' },
  { key: 'total_egresos',        label: 'Total Egresos',         Icon: TrendingDown, color: '#c0675a' },
  { key: 'utilidad_bruta',       label: 'Utilidad Bruta',        Icon: TrendingUp,   color: '#aba3ba' },
  { key: 'ticket_promedio',      label: 'Ticket Promedio',       Icon: Wallet,       color: '#887482' },
  { key: 'servicios_realizados', label: 'Servicios Realizados',  Icon: Users,        color: '#4a7c6a', isCount: true },
  { key: 'margen_bruto',         label: 'Margen Bruto',          Icon: Percent,      color: '#5a6aa0', isPercent: true },
  { key: 'nomina_total',         label: 'Nómina Total',          Icon: Users,        color: '#c0675a' },
  { key: 'costo_materiales',     label: 'Costo Materiales',      Icon: ShoppingBag,  color: '#887482' },
];

export default function DashboardKPIs() {
  const hoy = new Date().toISOString().slice(0, 7);
  const [mes, setMes]   = useState(hoy);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDashboardKPIs(mes)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mes]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-400">Mes:</label>
        <input
          type="month"
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
        />
      </div>

      {loading && <div className="text-center text-gray-400 py-12">Cargando KPIs…</div>}

      {!loading && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_CONFIG.map(({ key, label, Icon, color, isCount, isPercent }) => (
            <div key={key} className="rounded-xl p-4 bg-gray-800 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color }} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {isCount   ? data[key] :
                 isPercent ? fmtP(data[key]) :
                             fmt(data[key])}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data && (
        <div className="mt-4 p-3 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-400">
          💡 Regla de oro: Ingreso neto mensual debe superar 2.5× (costos fijos + nómina). 
          Margen bruto &lt; 50% → revisar precios o costos de insumos.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create EstadoResultados.jsx**

Create `frontend/src/components/finanzas/EstadoResultados.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { getEstadoResultados } from '../../api/finanzas';

const fmt  = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const fmtP = n => `${parseFloat(n || 0).toFixed(1)}%`;

function Row({ label, value, bold, indent, positive, negative, percent }) {
  const color = positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-white';
  return (
    <tr className="border-b border-gray-700">
      <td className={`py-2 text-sm ${indent ? 'pl-6 text-gray-400' : bold ? 'font-semibold text-gray-200' : 'text-gray-300'}`}>{label}</td>
      <td className={`py-2 text-right text-sm ${bold ? 'font-bold' : ''} ${color}`}>
        {percent ? fmtP(value) : fmt(value)}
      </td>
    </tr>
  );
}

export default function EstadoResultados() {
  const hoy = new Date().toISOString().slice(0, 7);
  const [mes, setMes]     = useState(hoy);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEstadoResultados(mes)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mes]);

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-400">Mes:</label>
        <input
          type="month" value={mes}
          onChange={e => setMes(e.target.value)}
          className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
        />
      </div>

      {loading && <div className="text-center text-gray-400 py-12">Cargando…</div>}

      {!loading && data && (
        <div className="rounded-xl overflow-hidden border border-gray-700">
          <div className="bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-200">
            Estado de Resultados — {data.mes}
          </div>
          <table className="w-full bg-gray-900">
            <tbody>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingresos</td>
              </tr>
              <Row label="Ingresos brutos por servicios" value={data.ingresos_brutos} indent />
              <Row label="(-) IVA estimado 16%" value={data.iva_estimado} indent />
              <Row label="▶ Ingresos netos" value={data.ingresos_netos} bold positive />

              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Costo de ventas</td>
              </tr>
              <Row label="(-) Costo materiales e insumos" value={data.costo_materiales} indent />
              <Row label="▶ Utilidad bruta" value={data.utilidad_bruta} bold positive={data.utilidad_bruta >= 0} negative={data.utilidad_bruta < 0} />

              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gastos operativos</td>
              </tr>
              <Row label="(-) Costos fijos (renta, servicios)" value={data.costos_fijos} indent />
              <Row label="(-) Nómina total" value={data.nomina_total} indent />
              <Row label="▶ Utilidad operativa" value={data.utilidad_operativa} bold positive={data.utilidad_operativa >= 0} negative={data.utilidad_operativa < 0} />

              <tr className="border-b border-gray-700 bg-gray-800/50">
                <td colSpan={2} className="py-1.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Indicadores</td>
              </tr>
              <Row label="Servicios realizados" value={data.servicios_realizados} indent />
              <Row label="Ticket promedio" value={data.ticket_promedio} indent />
              <Row label="Margen bruto (%)" value={data.margen_bruto} indent percent />
              <Row label="Margen neto (%)" value={data.margen_neto} indent percent />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add tabs to FinanzasPage.jsx**

In `frontend/src/pages/FinanzasPage.jsx`:

1. Add imports at the top:
```jsx
import DashboardKPIs    from '../components/finanzas/DashboardKPIs';
import EstadoResultados from '../components/finanzas/EstadoResultados';
```

2. In the `TABS` array, add after `{ id: 'caja', ... }`:
```jsx
{ id: 'dashboard',   label: 'Dashboard KPIs',        Icon: BarChart2,  soloAdmin: true },
{ id: 'estado',      label: 'Estado de Resultados',  Icon: DollarSign, soloAdmin: true },
```
(Import `BarChart2` and `DollarSign` from lucide-react if not already imported)

3. In the JSX render section that renders tab content, add cases:
```jsx
{tab === 'dashboard' && <DashboardKPIs />}
{tab === 'estado'    && <EstadoResultados />}
```

- [ ] **Step 5: Verify in browser**

Navigate to `http://localhost:5173/finanzas`. Admin user should see "Dashboard KPIs" and "Estado de Resultados" tabs. Both render without errors (zeros expected for empty months).

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add frontend/src/api/finanzas.js \
        frontend/src/components/finanzas/DashboardKPIs.jsx \
        frontend/src/components/finanzas/EstadoResultados.jsx \
        frontend/src/pages/FinanzasPage.jsx
git commit -m "feat(finanzas): add Dashboard KPIs and Estado de Resultados tabs"
```

---

### Task 6: Frontend — Insumos + Kits tabs (admin)

**Dependencies:** Task 2 must be done first

**Files:**
- Create: `frontend/src/api/insumos.js`
- Create: `frontend/src/components/finanzas/InsumosTab.jsx`
- Create: `frontend/src/components/finanzas/KitsTab.jsx`
- Modify: `frontend/src/pages/FinanzasPage.jsx`

- [ ] **Step 1: Create API client**

Create `frontend/src/api/insumos.js`:

```javascript
import api from './client';

export const getInsumos          = ()       => api.get('/insumos').then(r => r.data);
export const getCategoriasInsumos = ()      => api.get('/insumos/categorias').then(r => r.data);
export const updateInsumo        = (id, d)  => api.put(`/insumos/${id}`, d).then(r => r.data);
export const getKits             = ()       => api.get('/kits').then(r => r.data);
export const getKit              = (id)     => api.get(`/kits/${id}`).then(r => r.data);
export const updateKitItem       = (id, itemId, d) => api.put(`/kits/${id}/items/${itemId}`, d).then(r => r.data);
export const getCostoCabina      = (tratId) => api.get(`/tratamientos/${tratId}/costo-cabina`).then(r => r.data);
```

- [ ] **Step 2: Create InsumosTab.jsx**

Create `frontend/src/components/finanzas/InsumosTab.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { getInsumos, getCategoriasInsumos, updateInsumo } from '../../api/insumos';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function InsumosTab() {
  const [insumos,    setInsumos]    = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtro,     setFiltro]     = useState('');
  const [editing,    setEditing]    = useState(null); // { id, field, value }
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([getInsumos(), getCategoriasInsumos()])
      .then(([ins, cats]) => { setInsumos(ins); setCategorias(cats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayed = filtro
    ? insumos.filter(i => i.categoria === filtro)
    : insumos;

  async function saveEdit(insumo) {
    if (!editing) return;
    await updateInsumo(insumo.id, { [editing.field]: parseFloat(editing.value) || editing.value });
    setInsumos(prev => prev.map(i => i.id === insumo.id ? { ...i, [editing.field]: editing.value } : i));
    setEditing(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando insumos…</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-400">Categoría:</label>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white"
        >
          <option value="">Todas ({insumos.length})</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">{displayed.length} insumos</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Presentación</th>
              <th className="px-4 py-3 text-right">Precio Unit.</th>
              <th className="px-4 py-3 text-right">Costo/Unidad</th>
              <th className="px-4 py-3 text-right">Stock Mín.</th>
              <th className="px-4 py-3 text-right">Stock Act.</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {displayed.map(ins => (
              <tr key={ins.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">{ins.codigo}</td>
                <td className="px-4 py-2 text-white">{ins.nombre}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{ins.presentacion}</td>
                <td className="px-4 py-2 text-right text-gray-300">{fmt(ins.precio_unitario)}</td>
                <td className="px-4 py-2 text-right text-gray-300">{fmt(ins.costo_unidad)}</td>
                {/* Editable: stock_minimo */}
                <td className="px-4 py-2 text-right">
                  {editing?.id === ins.id && editing.field === 'stock_minimo' ? (
                    <span className="flex items-center justify-end gap-1">
                      <input type="number" value={editing.value} min={0}
                        onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                        className="w-16 text-right text-sm bg-gray-700 border border-gray-500 rounded px-1 text-white"
                      />
                      <button onClick={() => saveEdit(ins)} className="text-green-400 hover:text-green-300"><Check size={14}/></button>
                      <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-1 cursor-pointer group"
                          onClick={() => setEditing({ id: ins.id, field: 'stock_minimo', value: ins.stock_minimo })}>
                      <span className="text-gray-300">{ins.stock_minimo}</span>
                      <Pencil size={11} className="text-gray-600 group-hover:text-gray-400"/>
                    </span>
                  )}
                </td>
                {/* Editable: stock_actual */}
                <td className="px-4 py-2 text-right">
                  {editing?.id === ins.id && editing.field === 'stock_actual' ? (
                    <span className="flex items-center justify-end gap-1">
                      <input type="number" value={editing.value ?? ''} min={0}
                        onChange={e => setEditing(p => ({ ...p, value: e.target.value }))}
                        className="w-16 text-right text-sm bg-gray-700 border border-gray-500 rounded px-1 text-white"
                      />
                      <button onClick={() => saveEdit(ins)} className="text-green-400 hover:text-green-300"><Check size={14}/></button>
                      <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                    </span>
                  ) : (
                    <span className={`flex items-center justify-end gap-1 cursor-pointer group`}
                          onClick={() => setEditing({ id: ins.id, field: 'stock_actual', value: ins.stock_actual ?? '' })}>
                      <span className={ins.stock_actual !== null && ins.stock_actual <= ins.stock_minimo ? 'text-red-400' : 'text-gray-300'}>
                        {ins.stock_actual ?? '—'}
                      </span>
                      <Pencil size={11} className="text-gray-600 group-hover:text-gray-400"/>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create KitsTab.jsx**

Create `frontend/src/components/finanzas/KitsTab.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getKits, getKit } from '../../api/insumos';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function KitsTab() {
  const [kits,     setKits]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [detail,   setDetail]   = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getKits().then(setKits).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function toggle(kitId) {
    if (expanded === kitId) { setExpanded(null); return; }
    setExpanded(kitId);
    if (!detail[kitId]) {
      const data = await getKit(kitId);
      setDetail(p => ({ ...p, [kitId]: data }));
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando kits…</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-4">Costo de cabina = costo real de insumos consumidos por sesión. Click en un kit para ver el detalle.</p>
      {kits.map(kit => (
        <div key={kit.id} className="rounded-xl border border-gray-700 overflow-hidden">
          <button
            onClick={() => toggle(kit.id)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 text-left"
          >
            <span className="flex items-center gap-2">
              {expanded === kit.id ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
              <span className="text-sm font-medium text-white">{kit.nombre}</span>
            </span>
            <span className="text-sm font-bold" style={{ color: '#aba3ba' }}>
              Costo: {fmt(kit.costo_cabina)}
            </span>
          </button>

          {expanded === kit.id && detail[kit.id] && (
            <div className="bg-gray-900 px-4 pb-3">
              <table className="w-full text-xs mt-2">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="py-1.5 text-left">Insumo</th>
                    <th className="py-1.5 text-right">Cantidad</th>
                    <th className="py-1.5 text-right">Unidad</th>
                    <th className="py-1.5 text-right">Costo/Sesión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detail[kit.id].items.map(item => (
                    <tr key={item.id}>
                      <td className="py-1.5 text-gray-300">{item.nombre}</td>
                      <td className="py-1.5 text-right text-gray-400">{item.cantidad}</td>
                      <td className="py-1.5 text-right text-gray-400">{item.unidad}</td>
                      <td className="py-1.5 text-right text-white">{fmt(item.costo_sesion)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-600">
                    <td colSpan={3} className="py-2 text-right font-semibold text-gray-300">Total costo cabina</td>
                    <td className="py-2 text-right font-bold" style={{ color: '#aba3ba' }}>{fmt(detail[kit.id].costo_cabina)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add tabs to FinanzasPage.jsx**

1. Add imports:
```jsx
import InsumosTab from '../components/finanzas/InsumosTab';
import KitsTab    from '../components/finanzas/KitsTab';
```

2. Add to TABS array:
```jsx
{ id: 'insumos', label: 'Insumos', Icon: ShoppingBag, soloAdmin: true },
{ id: 'kits',    label: 'Kits x Tratamiento', Icon: Package, soloAdmin: true },
```
(Import `ShoppingBag` and `Package` from lucide-react)

3. Add to render section:
```jsx
{tab === 'insumos' && <InsumosTab />}
{tab === 'kits'    && <KitsTab />}
```

- [ ] **Step 5: Verify in browser**

Navigate to `/finanzas`. Tabs "Insumos" and "Kits x Tratamiento" visible for admin. Insumos table shows 92 rows. Kits list shows 10 kits with costo_cabina. Clicking a kit expands to show item breakdown.

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add frontend/src/api/insumos.js \
        frontend/src/components/finanzas/InsumosTab.jsx \
        frontend/src/components/finanzas/KitsTab.jsx \
        frontend/src/pages/FinanzasPage.jsx
git commit -m "feat(finanzas): add Insumos and Kits tabs with costo de cabina"
```

---

### Task 7: Frontend — Nómina tab

**Dependencies:** Task 3 must be done first

**Files:**
- Create: `frontend/src/api/nomina.js`
- Create: `frontend/src/components/finanzas/NominaTab.jsx`
- Modify: `frontend/src/pages/FinanzasPage.jsx`

- [ ] **Step 1: Create API client**

Create `frontend/src/api/nomina.js`:

```javascript
import api from './client';

export const getNomina         = (mes) => api.get('/nomina', { params: { mes } }).then(r => r.data);
export const getResumenNomina  = (mes) => api.get('/nomina/resumen', { params: { mes } }).then(r => r.data);
export const createNomina      = (d)   => api.post('/nomina', d).then(r => r.data);
export const updateNomina      = (id, d) => api.put(`/nomina/${id}`, d).then(r => r.data);
export const deleteNomina      = (id)  => api.delete(`/nomina/${id}`).then(r => r.data);
```

- [ ] **Step 2: Create NominaTab.jsx**

Create `frontend/src/components/finanzas/NominaTab.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { getNomina, getResumenNomina, createNomina, updateNomina, deleteNomina } from '../../api/nomina';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

const ROLES_SUGERIDOS = [
  'Dr./Dra. — Director(a) médico(a)',
  'Médico estético aplicador',
  'Enfermera / asistente médica',
  'Recepcionista / coordinadora',
  'Esteticista / terapeuta',
  'Esteticista / terapeuta 2',
  'Personal de limpieza',
  'Community manager / marketing',
  'Contador (honorarios)',
];

const EMPTY_FORM = { nombre_rol: '', sueldo_base: '', comision: '', bono: '', rfc: '', nss: '', observaciones: '' };

export default function NominaTab() {
  const hoy = new Date().toISOString().slice(0, 7);
  const [mes,     setMes]     = useState(hoy);
  const [rows,    setRows]    = useState([]);
  const [resumen, setResumen] = useState(null);
  const [form,    setForm]    = useState(null); // null = hidden, obj = add/edit
  const [editing, setEditing] = useState(null); // id being edited

  const cargar = () => {
    Promise.all([getNomina(mes), getResumenNomina(mes)])
      .then(([r, s]) => { setRows(r); setResumen(s); })
      .catch(console.error);
  };

  useEffect(() => { cargar(); }, [mes]);

  async function handleSave() {
    if (!form.nombre_rol || !form.sueldo_base) return alert('Nombre del rol y sueldo base son requeridos');
    const data = { ...form, mes, sueldo_base: parseFloat(form.sueldo_base) || 0, comision: parseFloat(form.comision) || 0, bono: parseFloat(form.bono) || 0 };
    if (editing) await updateNomina(editing, data);
    else await createNomina(data);
    setForm(null); setEditing(null); cargar();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro de nómina?')) return;
    await deleteNomina(id); cargar();
  }

  function startEdit(row) {
    setEditing(row.id);
    setForm({ nombre_rol: row.nombre_rol, sueldo_base: row.sueldo_base, comision: row.comision, bono: row.bono, rfc: row.rfc || '', nss: row.nss || '', observaciones: row.observaciones || '' });
  }

  const totalBruto  = rows.reduce((s, r) => s + parseFloat(r.sueldo_base) + parseFloat(r.comision) + parseFloat(r.bono), 0);
  const totalEmpresa = rows.reduce((s, r) => s + parseFloat(r.sueldo_base) * 0.25, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Mes:</label>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white" />
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#887482' }}>
          <Plus size={14} /> Agregar
        </button>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Nómina bruta empleados', val: fmt(totalBruto) },
            { label: 'IMSS + Infonavit (25% aprox)', val: fmt(totalBruto * 0.25) },
            { label: 'Costo total empresa', val: fmt(totalBruto * 1.25) },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl bg-gray-800 border border-gray-700 p-3">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className="text-xl font-bold text-white">{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {form && (
        <div className="mb-4 rounded-xl border border-gray-600 bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">{editing ? 'Editar registro' : 'Nuevo registro'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-gray-400 block mb-1">Nombre / Rol</label>
              <input list="roles-sugeridos" value={form.nombre_rol}
                onChange={e => setForm(p => ({ ...p, nombre_rol: e.target.value }))}
                className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white"
                placeholder="Nombre o rol del empleado" />
              <datalist id="roles-sugeridos">{ROLES_SUGERIDOS.map(r => <option key={r} value={r}/>)}</datalist>
            </div>
            {[
              { field: 'sueldo_base', label: 'Sueldo Base ($)' },
              { field: 'comision',    label: 'Comisión ($)' },
              { field: 'bono',        label: 'Bono ($)' },
              { field: 'rfc',         label: 'RFC', text: true },
              { field: 'nss',         label: 'NSS', text: true },
            ].map(({ field, label, text }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type={text ? 'text' : 'number'} value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-1.5 rounded text-sm font-medium text-white" style={{ background: '#4a7c6a' }}>Guardar</button>
            <button onClick={() => { setForm(null); setEditing(null); }} className="px-4 py-1.5 rounded text-sm text-gray-300 border border-gray-600">Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nombre / Rol</th>
              <th className="px-4 py-3 text-right">Sueldo Base</th>
              <th className="px-4 py-3 text-right">Comisión</th>
              <th className="px-4 py-3 text-right">Bono</th>
              <th className="px-4 py-3 text-right">Total Empleado</th>
              <th className="px-4 py-3 text-right">IMSS+INFONAVIT</th>
              <th className="px-4 py-3 text-right">Costo Empresa</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Sin registros para {mes}</td></tr>
            )}
            {rows.map(r => {
              const totalEmpleado = parseFloat(r.sueldo_base) + parseFloat(r.comision) + parseFloat(r.bono);
              const imss = parseFloat(r.sueldo_base) * 0.25;
              return (
                <tr key={r.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-white">{r.nombre_rol}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.sueldo_base)}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.comision)}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.bono)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-white">{fmt(totalEmpleado)}</td>
                  <td className="px-4 py-2 text-right text-gray-400">{fmt(imss)}</td>
                  <td className="px-4 py-2 text-right font-semibold" style={{ color: '#aba3ba' }}>{fmt(totalEmpleado + imss)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-white"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length > 0 && (
              <tr className="bg-gray-800 font-bold">
                <td className="px-4 py-2 text-gray-200">TOTAL</td>
                <td colSpan={3}></td>
                <td className="px-4 py-2 text-right text-white">{fmt(totalBruto)}</td>
                <td className="px-4 py-2 text-right text-gray-400">{fmt(totalEmpresa)}</td>
                <td className="px-4 py-2 text-right" style={{ color: '#aba3ba' }}>{fmt(totalBruto + totalEmpresa)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add tab to FinanzasPage.jsx**

1. Add import:
```jsx
import NominaTab from '../components/finanzas/NominaTab';
```

2. Add to TABS:
```jsx
{ id: 'nomina', label: 'Nómina', Icon: Users, soloAdmin: true },
```

3. Add to render:
```jsx
{tab === 'nomina' && <NominaTab />}
```

- [ ] **Step 4: Verify in browser**

Navigate to `/finanzas`. Tab "Nómina" visible for admin. Mes selector works. "Agregar" button opens inline form. Saving persists data. Table shows rows with computed IMSS+INFONAVIT column.

- [ ] **Step 5: Commit**

```bash
cd ~/elys
git add frontend/src/api/nomina.js \
        frontend/src/components/finanzas/NominaTab.jsx \
        frontend/src/pages/FinanzasPage.jsx
git commit -m "feat(finanzas): add Nómina mensual tab"
```

---

### Task 8: Frontend — Cuentas x Pagar tab

**Dependencies:** Task 3 must be done first

**Files:**
- Create: `frontend/src/api/cuentasPorPagar.js`
- Create: `frontend/src/components/finanzas/CuentasXPagarTab.jsx`
- Modify: `frontend/src/pages/FinanzasPage.jsx`

- [ ] **Step 1: Create API client**

Create `frontend/src/api/cuentasPorPagar.js`:

```javascript
import api from './client';

export const getCuentasPorPagar    = (estatus) => api.get('/cuentas-por-pagar', { params: estatus ? { estatus } : {} }).then(r => r.data);
export const getResumenCXP         = ()        => api.get('/cuentas-por-pagar/resumen').then(r => r.data);
export const createCuentaPorPagar  = (d)       => api.post('/cuentas-por-pagar', d).then(r => r.data);
export const updateCuentaPorPagar  = (id, d)   => api.put(`/cuentas-por-pagar/${id}`, d).then(r => r.data);
export const deleteCuentaPorPagar  = (id)      => api.delete(`/cuentas-por-pagar/${id}`).then(r => r.data);
```

- [ ] **Step 2: Create CuentasXPagarTab.jsx**

Create `frontend/src/components/finanzas/CuentasXPagarTab.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { getCuentasPorPagar, getResumenCXP, createCuentaPorPagar, updateCuentaPorPagar, deleteCuentaPorPagar } from '../../api/cuentasPorPagar';

const fmt  = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const ESTATUS_COLORS = { pendiente: '#c0675a', parcial: '#d4a03a', liquidada: '#4a7c6a' };

const EMPTY_FORM = {
  folio_factura: '', proveedor_nombre: '', concepto: '', fecha_factura: '',
  fecha_vencimiento: '', importe_total: '', pagado: '', estatus: 'pendiente',
  forma_pago: '', observaciones: '',
};

export default function CuentasXPagarTab() {
  const [rows,    setRows]    = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtro,  setFiltro]  = useState('');
  const [form,    setForm]    = useState(null);
  const [editing, setEditing] = useState(null);

  const cargar = () => {
    Promise.all([getCuentasPorPagar(filtro || undefined), getResumenCXP()])
      .then(([r, s]) => { setRows(r); setResumen(s); })
      .catch(console.error);
  };

  useEffect(() => { cargar(); }, [filtro]);

  async function handleSave() {
    if (!form.concepto || !form.importe_total) return alert('Concepto e importe total son requeridos');
    const data = { ...form, importe_total: parseFloat(form.importe_total) || 0, pagado: parseFloat(form.pagado) || 0 };
    if (editing) await updateCuentaPorPagar(editing, data);
    else await createCuentaPorPagar(data);
    setForm(null); setEditing(null); cargar();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta cuenta por pagar?')) return;
    await deleteCuentaPorPagar(id); cargar();
  }

  function startEdit(row) {
    setEditing(row.id);
    setForm({
      folio_factura: row.folio_factura || '', proveedor_nombre: row.proveedor_nombre || '',
      concepto: row.concepto, fecha_factura: row.fecha_factura?.slice(0, 10) || '',
      fecha_vencimiento: row.fecha_vencimiento?.slice(0, 10) || '',
      importe_total: row.importe_total, pagado: row.pagado, estatus: row.estatus,
      forma_pago: row.forma_pago || '', observaciones: row.observaciones || '',
    });
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {/* Resumen KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total pendiente', val: fmt(resumen.total_pendiente), color: '#c0675a' },
            { label: 'Pendientes',      val: resumen.count_pendiente,      color: '#c0675a' },
            { label: 'Parciales',       val: resumen.count_parcial,        color: '#d4a03a' },
            { label: 'Vencidas',        val: resumen.count_vencidas,       color: resumen.count_vencidas > 0 ? '#c0675a' : '#4a7c6a' },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl bg-gray-800 border border-gray-700 p-3">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className="text-2xl font-bold" style={{ color }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Filtrar:</label>
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className="border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-800 text-white">
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="parcial">Parciales</option>
            <option value="liquidada">Liquidadas</option>
          </select>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: '#887482' }}>
          <Plus size={14}/> Nueva factura
        </button>
      </div>

      {/* Form */}
      {form && (
        <div className="mb-4 rounded-xl border border-gray-600 bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">{editing ? 'Editar factura' : 'Nueva factura'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { field: 'folio_factura',     label: 'Folio Factura' },
              { field: 'proveedor_nombre',  label: 'Proveedor' },
              { field: 'fecha_factura',     label: 'Fecha Factura',     type: 'date' },
              { field: 'fecha_vencimiento', label: 'Fecha Vencimiento', type: 'date' },
              { field: 'importe_total',     label: 'Importe Total ($)',  type: 'number' },
              { field: 'pagado',            label: 'Pagado ($)',         type: 'number' },
              { field: 'forma_pago',        label: 'Forma de Pago' },
            ].map(({ field, label, type = 'text' }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type={type} value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Concepto</label>
              <input value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Estatus</label>
              <select value={form.estatus} onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                className="w-full border border-gray-600 rounded px-3 py-1.5 text-sm bg-gray-700 text-white">
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="liquidada">Liquidada</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-1.5 rounded text-sm font-medium text-white" style={{ background: '#4a7c6a' }}>Guardar</button>
            <button onClick={() => { setForm(null); setEditing(null); }} className="px-4 py-1.5 rounded text-sm text-gray-300 border border-gray-600">Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Proveedor / Concepto</th>
              <th className="px-4 py-3 text-left">Folio</th>
              <th className="px-4 py-3 text-left">Vencimiento</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-right">Pagado</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3">Estatus</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-500">Sin cuentas por pagar</td></tr>
            )}
            {rows.map(r => {
              const vencida = r.fecha_vencimiento && r.fecha_vencimiento.slice(0,10) < hoy && r.estatus !== 'liquidada';
              return (
                <tr key={r.id} className={`hover:bg-gray-800/50 ${vencida ? 'bg-red-950/20' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="text-white">{r.proveedor_nombre || r.proveedor_real || '—'}</div>
                    <div className="text-xs text-gray-400">{r.concepto}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{r.folio_factura || '—'}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={vencida ? 'text-red-400 flex items-center gap-1' : 'text-gray-300'}>
                      {vencida && <AlertTriangle size={12}/>}
                      {r.fecha_vencimiento?.slice(0, 10) || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-white">{fmt(r.importe_total)}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{fmt(r.pagado)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-white">{fmt(r.importe_total - r.pagado)}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ background: ESTATUS_COLORS[r.estatus] }}>
                      {r.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-white"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add tab to FinanzasPage.jsx**

1. Add import:
```jsx
import CuentasXPagarTab from '../components/finanzas/CuentasXPagarTab';
```

2. Add to TABS:
```jsx
{ id: 'cxp', label: 'Cuentas x Pagar', Icon: FileText, soloAdmin: true },
```
(Import `FileText` from lucide-react)

3. Add to render:
```jsx
{tab === 'cxp' && <CuentasXPagarTab />}
```

- [ ] **Step 4: Verify in browser**

Navigate to `/finanzas`. Tab "Cuentas x Pagar" visible for admin. Resumen shows 4 KPI cards. Filter dropdown works. "Nueva factura" form saves and rows appear in table. Rows vencidas appear with red highlight.

- [ ] **Step 5: Commit**

```bash
cd ~/elys
git add frontend/src/api/cuentasPorPagar.js \
        frontend/src/components/finanzas/CuentasXPagarTab.jsx \
        frontend/src/pages/FinanzasPage.jsx
git commit -m "feat(finanzas): add Cuentas x Pagar tab with vencidas alert"
```

---

## Deploy final

After all 8 tasks committed:

```bash
cd ~/elys && npm run build --prefix frontend && ./deploy.sh
```

Migration 031 applies automatically on backend restart. Verify on `http://62.238.3.136:8088/finanzas`.

---

## Self-Review Checklist

- [x] Estado de Resultados cubre Dashboard + ER hojas del Excel
- [x] Insumos CRUD cubre hoja Catálogo Insumos
- [x] Kits cubre hoja Kit por Tratamiento con costo_cabina calculado
- [x] Nómina cubre hoja Nómina
- [x] Cuentas x Pagar cubre hojas Notas x Pagar + Notas Pagadas (unificadas)
- [x] CajaPanel enriquecido con costo_cabina + margen
- [x] Proveedores: ya existían en Farmacia, migration 030 los amplió — no se duplica
- [x] Egresos fijos: migration 030 ya los sembró en movimientos — visible en Estado de Resultados
- [x] Flujo de Caja proyectado (4 meses): NOT INCLUDED — requiere input manual de proyecciones, baja prioridad vs las otras 8 funcionalidades, agregar en iteración siguiente si se requiere
