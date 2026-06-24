# Remisiones y Facturas CFDI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El POS de Farmacia y el módulo Caja (cobro de tratamientos) pueden generar una remisión (PDF sin validez fiscal) o una factura CFDI (timbrada vía Facturapi, en modo sandbox hasta que Gioval tenga RFC/CSD/cuenta PAC real) para cualquier venta o cobro ya realizado.

**Architecture:** Una capa de servicio (`comprobanteService.js`) agnóstica de origen normaliza dos fuentes de venta (`farmacia_ventas`+`farmacia_items_venta` y `movimientos`+`citas`+`tratamientos`) en una lista común de conceptos. La remisión se genera 100% en el cliente (jsPDF, ya instalado en frontend, mismo patrón que `ReportesFinanzas.jsx`) a partir de datos que el backend devuelve — sin almacenar ningún PDF en el servidor. La factura usa el SDK oficial de Facturapi; el PDF/XML fiscal vive en Facturapi, no en nuestro servidor — se descarga vía proxy cuando se necesita.

**Tech Stack:** Node.js + Express 5, PostgreSQL (pg, sin ORM), SDK `facturapi` (Node), React 19, `jspdf` (ya instalado, sin plugins nuevos).

## Global Constraints

- No hay framework de tests instalado — verificar con scripts `assert` en backend y `npm run build` + prueba manual en frontend.
- Migraciones en `backend/src/db/migrations/`, se aplican automáticamente al iniciar el backend. La última existente es `029_consentimientos_generales.sql` — esta es `030_comprobantes.sql`.
- Roles reales en el sistema: `admin`, `asistente_medico`, `cosmetista`, `asistente_general` (constraint en BD), más `FARMACISTA` (string suelto, no en el constraint, usado solo en `authFarmacia.js`) y el flag booleano `puede_caja` en `usuarios`. El JWT (`req.user` tras `authMiddleware`) ya incluye `{ id, email, nombre, rol, puede_caja }`.
- Permisos de este feature: generar remisión/factura para `origen='farmacia_venta'` requiere `rol IN ('admin','FARMACISTA')`; para `origen='movimiento'` requiere `rol === 'admin' || req.user.puede_caja === true || rol === 'asistente_general'` (mismo criterio que ya usa Caja). Editar Configuración Fiscal requiere `rol === 'admin'`.
- Facturapi: modo controlado por `process.env.FACTURAPI_MODO` (`'test'` por defecto o `'live'`), usando `FACTURAPI_TEST_KEY` o `FACTURAPI_KEY` respectivamente. **Antes de ejecutar el Task 4, el usuario debe crear una cuenta gratuita en facturapi.io y obtener una API key de prueba (`sk_test_...`)** — sin eso no se puede verificar el timbrado real contra el sandbox.
- No se construye una abstracción de "buscar o reusar cliente Facturapi" — cada factura crea un customer nuevo en Facturapi (`customers.create`). Es la simplificación correcta para el volumen de este negocio; si en el futuro esto genera ruido en su dashboard, se puede añadir caché entonces.

---

### Task 1: Migración 030 — tablas `comprobantes`, `configuracion_fiscal`, columnas fiscales

**Files:**
- Create: `backend/src/db/migrations/030_comprobantes.sql`
- Create: `backend/src/models/comprobante.js`
- Create: `backend/src/models/configuracionFiscal.js`
- Create: `backend/src/scripts/test_comprobantes.js`

**Interfaces:**
- Produces: `Comprobante.create(data)`, `Comprobante.findById(id)`, `Comprobante.findByOrigen(origen, origenId)`, `Comprobante.nextFolio(tipo)`; `ConfiguracionFiscal.get()`, `ConfiguracionFiscal.update(data)`.

- [ ] **Step 1: Escribir la migración**

```sql
-- backend/src/db/migrations/030_comprobantes.sql
-- Comprobantes de venta (remisión sin validez fiscal, o factura CFDI vía
-- Facturapi) para los dos orígenes de cobro: farmacia_venta y movimiento
-- (cobro de tratamiento en Caja). No guarda PDFs: la remisión se genera
-- en el cliente a partir de los conceptos; la factura se descarga de
-- Facturapi usando facturapi_invoice_id.

CREATE TABLE IF NOT EXISTS comprobantes (
  id               SERIAL PRIMARY KEY,
  tipo             VARCHAR(10)  NOT NULL CHECK (tipo IN ('remision', 'factura')),
  origen           VARCHAR(20)  NOT NULL CHECK (origen IN ('farmacia_venta', 'movimiento')),
  origen_id        INTEGER      NOT NULL,
  folio            VARCHAR(30)  NOT NULL UNIQUE,
  fecha            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  receptor_nombre  VARCHAR(255) NOT NULL,
  receptor_rfc     VARCHAR(13),
  subtotal         NUMERIC(12,2) NOT NULL,
  total            NUMERIC(12,2) NOT NULL,
  facturapi_invoice_id VARCHAR(50),
  uuid_fiscal      VARCHAR(50),
  estado           VARCHAR(20)  NOT NULL DEFAULT 'generado' CHECK (estado IN ('generado', 'cancelado')),
  created_by       INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comprobantes_origen ON comprobantes(origen, origen_id);

CREATE TABLE IF NOT EXISTS configuracion_fiscal (
  id               SERIAL PRIMARY KEY,
  razon_social     VARCHAR(255),
  rfc              VARCHAR(13),
  regimen_fiscal   VARCHAR(10),
  codigo_postal    VARCHAR(5),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO configuracion_fiscal (razon_social, rfc, regimen_fiscal, codigo_postal)
SELECT NULL, NULL, NULL, NULL WHERE NOT EXISTS (SELECT 1 FROM configuracion_fiscal);

ALTER TABLE farmacia_clientes ADD COLUMN IF NOT EXISTS rfc VARCHAR(13);
ALTER TABLE farmacia_clientes ADD COLUMN IF NOT EXISTS razon_social_fiscal VARCHAR(255);
ALTER TABLE farmacia_clientes ADD COLUMN IF NOT EXISTS regimen_fiscal_receptor VARCHAR(10);
ALTER TABLE farmacia_clientes ADD COLUMN IF NOT EXISTS codigo_postal_fiscal VARCHAR(5);
ALTER TABLE farmacia_clientes ADD COLUMN IF NOT EXISTS uso_cfdi_default VARCHAR(4);

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS rfc VARCHAR(13);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS razon_social_fiscal VARCHAR(255);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS regimen_fiscal_receptor VARCHAR(10);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS codigo_postal_fiscal VARCHAR(5);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS uso_cfdi_default VARCHAR(4);
```

- [ ] **Step 2: Aplicar la migración arrancando el backend**

Run: `cd ~/elys/backend && npm run dev`
Expected (en consola, una sola vez): `Migración aplicada: 030_comprobantes.sql`
Detener con Ctrl+C una vez visto el mensaje.

- [ ] **Step 3: Escribir el modelo `Comprobante`**

```js
// backend/src/models/comprobante.js
const pool = require('../db/pool');

const Comprobante = {
  async create(data) {
    const {
      tipo, origen, origen_id, folio, receptor_nombre, receptor_rfc,
      subtotal, total, facturapi_invoice_id, uuid_fiscal, created_by,
    } = data;
    const { rows } = await pool.query(
      `INSERT INTO comprobantes
         (tipo, origen, origen_id, folio, receptor_nombre, receptor_rfc,
          subtotal, total, facturapi_invoice_id, uuid_fiscal, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [tipo, origen, origen_id, folio, receptor_nombre, receptor_rfc ?? null,
       subtotal, total, facturapi_invoice_id ?? null, uuid_fiscal ?? null, created_by ?? null]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM comprobantes WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async findByOrigen(origen, origenId) {
    const { rows } = await pool.query(
      'SELECT * FROM comprobantes WHERE origen = $1 AND origen_id = $2 ORDER BY created_at DESC',
      [origen, origenId]
    );
    return rows;
  },

  async nextFolio(tipo) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM comprobantes WHERE tipo = $1', [tipo]
    );
    const n = rows[0].n + 1;
    const prefijo = tipo === 'remision' ? 'R' : 'F';
    return `${prefijo}-${String(n).padStart(6, '0')}`;
  },
};

module.exports = Comprobante;
```

- [ ] **Step 4: Escribir el modelo `ConfiguracionFiscal`**

```js
// backend/src/models/configuracionFiscal.js
const pool = require('../db/pool');

const ConfiguracionFiscal = {
  async get() {
    const { rows } = await pool.query('SELECT * FROM configuracion_fiscal LIMIT 1');
    return rows[0] || null;
  },

  async update(data) {
    const { razon_social, rfc, regimen_fiscal, codigo_postal } = data;
    const actual = await this.get();
    const { rows } = await pool.query(
      `UPDATE configuracion_fiscal SET
         razon_social = $1, rfc = $2, regimen_fiscal = $3, codigo_postal = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [razon_social, rfc, regimen_fiscal, codigo_postal, actual.id]
    );
    return rows[0];
  },
};

module.exports = ConfiguracionFiscal;
```

- [ ] **Step 5: Escribir el script de verificación**

```js
// backend/src/scripts/test_comprobantes.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const assert = require('assert');
const pool = require('../db/pool');
const Comprobante = require('../models/comprobante');
const ConfiguracionFiscal = require('../models/configuracionFiscal');

async function run() {
  const config = await ConfiguracionFiscal.get();
  assert.ok(config, 'configuracion_fiscal debería tener una fila sembrada');

  const folio1 = await Comprobante.nextFolio('remision');
  const c1 = await Comprobante.create({
    tipo: 'remision', origen: 'farmacia_venta', origen_id: 999999,
    folio: folio1, receptor_nombre: 'Cliente de prueba', subtotal: 100, total: 100,
  });
  assert.ok(c1.id, 'create no devolvió id');
  assert.strictEqual(c1.folio, folio1);

  const folio2 = await Comprobante.nextFolio('remision');
  assert.notStrictEqual(folio1, folio2, 'nextFolio debería incrementar');

  const encontrados = await Comprobante.findByOrigen('farmacia_venta', 999999);
  assert.strictEqual(encontrados.length, 1);
  assert.strictEqual(encontrados[0].id, c1.id);

  await pool.query('DELETE FROM comprobantes WHERE id = $1', [c1.id]);
  console.log('✓ Comprobante y ConfiguracionFiscal funcionan');
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 6: Ejecutar el script y verificar que pasa**

Run: `cd ~/elys/backend && node src/scripts/test_comprobantes.js`
Expected: `✓ Comprobante y ConfiguracionFiscal funcionan` (exit code 0, sin stack trace)

- [ ] **Step 7: Commit**

```bash
cd ~/elys
git add backend/src/db/migrations/030_comprobantes.sql backend/src/models/comprobante.js backend/src/models/configuracionFiscal.js backend/src/scripts/test_comprobantes.js
git commit -m "feat: tablas y modelos base de comprobantes (remisión/factura)"
```

---

### Task 2: `comprobanteService` — conceptos y datos del receptor (sin Facturapi todavía)

**Files:**
- Create: `backend/src/services/comprobanteService.js`
- Modify: `backend/src/scripts/test_comprobantes.js`

**Interfaces:**
- Consumes: tablas `farmacia_ventas`, `farmacia_items_venta`, `farmacia_productos`, `movimientos`, `citas`, `tratamientos`, `farmacia_clientes`, `pacientes` (ya existentes).
- Produces: `construirConceptos(origen, origenId)` → `[{descripcion, cantidad, precio_unitario, importe}]`; `datosReceptor(origen, origenId)` → `{nombre, metodo_pago, cliente_id, paciente_id, rfc, razon_social_fiscal, regimen_fiscal_receptor, codigo_postal_fiscal, uso_cfdi_default}`; `guardarDatosFiscales(receptor, datosFiscales)`; `subtotalYTotal(conceptos)`.

- [ ] **Step 1: Escribir `comprobanteService.js`**

```js
// backend/src/services/comprobanteService.js
const pool = require('../db/pool');

async function construirConceptos(origen, origenId) {
  if (origen === 'farmacia_venta') {
    const { rows } = await pool.query(
      `SELECT fp.nombre AS descripcion, fiv.cantidad,
              fiv.precio_unitario::numeric AS precio_unitario, fiv.subtotal::numeric AS importe
       FROM farmacia_items_venta fiv
       JOIN farmacia_productos fp ON fp.id = fiv.producto_id
       WHERE fiv.venta_id = $1`,
      [origenId]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT COALESCE(t.nombre, m.concepto) AS descripcion, 1 AS cantidad,
            m.monto::numeric AS precio_unitario, m.monto::numeric AS importe
     FROM movimientos m
     LEFT JOIN citas ci ON m.cita_id = ci.id
     LEFT JOIN tratamientos t ON ci.tratamiento_id = t.id
     WHERE m.id = $1`,
    [origenId]
  );
  return rows;
}

async function datosReceptor(origen, origenId) {
  if (origen === 'farmacia_venta') {
    const { rows } = await pool.query(
      `SELECT fv.metodo_pago,
              COALESCE(fc.nombre, p.nombre, 'Público en general') AS nombre,
              fc.id AS cliente_id, fc.rfc, fc.razon_social_fiscal,
              fc.regimen_fiscal_receptor, fc.codigo_postal_fiscal, fc.uso_cfdi_default,
              p.id AS paciente_id
       FROM farmacia_ventas fv
       LEFT JOIN farmacia_clientes fc ON fv.cliente_id = fc.id
       LEFT JOIN pacientes p ON fv.paciente_id = p.id
       WHERE fv.id = $1`,
      [origenId]
    );
    return rows[0] || null;
  }
  const { rows } = await pool.query(
    `SELECT m.forma_pago AS metodo_pago,
            CONCAT_WS(' ', p.nombre, p.apellido_paterno) AS nombre,
            p.id AS paciente_id, p.rfc, p.razon_social_fiscal,
            p.regimen_fiscal_receptor, p.codigo_postal_fiscal, p.uso_cfdi_default
     FROM movimientos m
     LEFT JOIN citas ci ON m.cita_id = ci.id
     LEFT JOIN pacientes p ON ci.paciente_id = p.id
     WHERE m.id = $1`,
    [origenId]
  );
  return rows[0] || null;
}

async function guardarDatosFiscales(receptor, datosFiscales) {
  const { rfc, razon_social_fiscal, regimen_fiscal_receptor, codigo_postal_fiscal, uso_cfdi_default } = datosFiscales;
  if (receptor.cliente_id) {
    await pool.query(
      `UPDATE farmacia_clientes SET rfc = $1, razon_social_fiscal = $2,
         regimen_fiscal_receptor = $3, codigo_postal_fiscal = $4, uso_cfdi_default = $5
       WHERE id = $6`,
      [rfc, razon_social_fiscal, regimen_fiscal_receptor, codigo_postal_fiscal, uso_cfdi_default, receptor.cliente_id]
    );
  } else if (receptor.paciente_id) {
    await pool.query(
      `UPDATE pacientes SET rfc = $1, razon_social_fiscal = $2,
         regimen_fiscal_receptor = $3, codigo_postal_fiscal = $4, uso_cfdi_default = $5
       WHERE id = $6`,
      [rfc, razon_social_fiscal, regimen_fiscal_receptor, codigo_postal_fiscal, uso_cfdi_default, receptor.paciente_id]
    );
  }
}

function subtotalYTotal(conceptos) {
  const subtotal = conceptos.reduce((acc, c) => acc + parseFloat(c.importe), 0);
  return { subtotal, total: subtotal }; // sin impuestos desglosados en este negocio (precios ya incluyen lo que incluyan)
}

const FORMA_PAGO_SAT = { efectivo: '01', transferencia: '03', tarjeta: '04', otro: '99' };

function formaPagoSAT(metodoPago) {
  return FORMA_PAGO_SAT[metodoPago] || '99';
}

module.exports = { construirConceptos, datosReceptor, guardarDatosFiscales, subtotalYTotal, formaPagoSAT };
```

- [ ] **Step 2: Extender el script de verificación para cubrir ambos orígenes**

Modify `backend/src/scripts/test_comprobantes.js` — agregar antes de `console.log('✓ Comprobante y ConfiguracionFiscal funcionan');`:

```js
  const { construirConceptos, datosReceptor, subtotalYTotal, formaPagoSAT } = require('../services/comprobanteService');

  // Origen farmacia_venta: usa una venta real si existe alguna con items, si no se omite (no es error)
  const { rows: ventaConItems } = await pool.query(
    `SELECT venta_id FROM farmacia_items_venta LIMIT 1`
  );
  if (ventaConItems.length) {
    const conceptos = await construirConceptos('farmacia_venta', ventaConItems[0].venta_id);
    assert.ok(conceptos.length > 0, 'construirConceptos(farmacia_venta) no regresó conceptos');
    assert.ok(conceptos[0].descripcion, 'concepto sin descripcion');
    const { subtotal } = subtotalYTotal(conceptos);
    assert.ok(subtotal > 0, 'subtotal debería ser mayor a 0');
    const receptor = await datosReceptor('farmacia_venta', ventaConItems[0].venta_id);
    assert.ok(receptor.nombre, 'datosReceptor(farmacia_venta) sin nombre');
    console.log('✓ construirConceptos/datosReceptor para farmacia_venta funcionan');
  } else {
    console.log('⚠ sin ventas de farmacia con items, se omite esa prueba (no es error)');
  }

  // Origen movimiento: usa un movimiento real con cita_id si existe alguno
  const { rows: movConCita } = await pool.query(
    `SELECT id FROM movimientos WHERE cita_id IS NOT NULL LIMIT 1`
  );
  if (movConCita.length) {
    const conceptos = await construirConceptos('movimiento', movConCita[0].id);
    assert.strictEqual(conceptos.length, 1, 'movimiento debería producir exactamente 1 concepto');
    assert.ok(conceptos[0].descripcion, 'concepto de movimiento sin descripcion');
    const receptor = await datosReceptor('movimiento', movConCita[0].id);
    assert.ok(receptor.nombre, 'datosReceptor(movimiento) sin nombre');
    console.log('✓ construirConceptos/datosReceptor para movimiento funcionan');
  } else {
    console.log('⚠ sin movimientos con cita_id, se omite esa prueba (no es error)');
  }

  assert.strictEqual(formaPagoSAT('efectivo'), '01');
  assert.strictEqual(formaPagoSAT('tarjeta'), '04');
  assert.strictEqual(formaPagoSAT('algo_raro'), '99');
```

- [ ] **Step 3: Ejecutar el script extendido**

Run: `cd ~/elys/backend && node src/scripts/test_comprobantes.js`
Expected: todos los mensajes `✓`/`⚠` impresos, sin error ni stack trace.

- [ ] **Step 4: Commit**

```bash
cd ~/elys
git add backend/src/services/comprobanteService.js backend/src/scripts/test_comprobantes.js
git commit -m "feat: comprobanteService — conceptos y datos del receptor para ambos orígenes"
```

---

### Task 3: Remisión end-to-end (backend + frontend, sin Facturapi)

**Files:**
- Create: `backend/src/controllers/comprobantesController.js`
- Create: `backend/src/routes/comprobantes.js`
- Modify: `backend/src/index.js`
- Create: `frontend/src/api/comprobantes.js`
- Create: `frontend/src/utils/pdfRemision.js`
- Create: `frontend/src/components/ComprobanteButtons.jsx`
- Modify: `frontend/src/pages/farmacia/FarmaciaPOS.jsx`

**Interfaces:**
- Consumes: `comprobanteService` (Task 2), `Comprobante` (Task 1).
- Produces: `POST /api/comprobantes/remision` `{origen, origen_id}` → comprobante con `conceptos` incluidos en la respuesta; `GET /api/comprobantes/origen/:origen/:origenId` → lista; `generarRemisionPDF(comprobante)` (frontend, dispara descarga).

- [ ] **Step 1: Controller de comprobantes (solo remisión por ahora)**

```js
// backend/src/controllers/comprobantesController.js
const Comprobante = require('../models/comprobante');
const { construirConceptos, datosReceptor, subtotalYTotal } = require('../services/comprobanteService');

function puedeGenerar(req, origen) {
  if (origen === 'farmacia_venta') return ['admin', 'FARMACISTA'].includes(req.user.rol);
  return req.user.rol === 'admin' || req.user.rol === 'asistente_general' || req.user.puede_caja === true;
}

exports.generarRemision = async (req, res, next) => {
  try {
    const { origen, origen_id } = req.body;
    if (!['farmacia_venta', 'movimiento'].includes(origen) || !origen_id) {
      return res.status(400).json({ error: 'origen y origen_id son requeridos' });
    }
    if (!puedeGenerar(req, origen)) return res.status(403).json({ error: 'Sin permisos' });

    const conceptos = await construirConceptos(origen, origen_id);
    if (!conceptos.length) return res.status(400).json({ error: 'No hay conceptos para este origen' });
    const receptor = await datosReceptor(origen, origen_id);
    const { subtotal, total } = subtotalYTotal(conceptos);
    const folio = await Comprobante.nextFolio('remision');

    const comprobante = await Comprobante.create({
      tipo: 'remision', origen, origen_id, folio,
      receptor_nombre: receptor.nombre, subtotal, total, created_by: req.user.id,
    });
    res.status(201).json({ ...comprobante, conceptos });
  } catch (e) { next(e); }
};

exports.getPorOrigen = async (req, res, next) => {
  try {
    const { origen, origenId } = req.params;
    const comprobantes = await Comprobante.findByOrigen(origen, origenId);
    res.json(comprobantes);
  } catch (e) { next(e); }
};

exports.getConceptos = async (req, res, next) => {
  try {
    const comprobante = await Comprobante.findById(req.params.id);
    if (!comprobante) return res.status(404).json({ error: 'No encontrado' });
    const conceptos = await construirConceptos(comprobante.origen, comprobante.origen_id);
    res.json({ ...comprobante, conceptos });
  } catch (e) { next(e); }
};
```

- [ ] **Step 2: Rutas**

```js
// backend/src/routes/comprobantes.js
const router = require('express').Router();
const ctrl = require('../controllers/comprobantesController');

router.post('/remision', ctrl.generarRemision);
router.get('/origen/:origen/:origenId', ctrl.getPorOrigen);
router.get('/:id', ctrl.getConceptos);

module.exports = router;
```

- [ ] **Step 3: Registrar la ruta en `index.js`**

Modify `backend/src/index.js` — agregar después de la línea `app.use('/api/flujo', authMiddleware, require('./routes/flujo'));`:

```js
app.use('/api/comprobantes', authMiddleware, require('./routes/comprobantes'));
```

- [ ] **Step 4: Verificar que el backend arranca**

Run: `cd ~/elys/backend && npm run dev`
Expected: `Backend Elys corriendo en puerto 3008`, sin errores. Detener con Ctrl+C.

- [ ] **Step 5: API frontend**

```js
// frontend/src/api/comprobantes.js
import api from './client';

export const generarRemision = (origen, origen_id) =>
  api.post('/comprobantes/remision', { origen, origen_id }).then(r => r.data);

export const getComprobantesPorOrigen = (origen, origenId) =>
  api.get(`/comprobantes/origen/${origen}/${origenId}`).then(r => r.data);

export const getComprobanteConConceptos = (id) =>
  api.get(`/comprobantes/${id}`).then(r => r.data);
```

- [ ] **Step 6: Generador de PDF de remisión (cliente)**

```js
// frontend/src/utils/pdfRemision.js
import { jsPDF } from 'jspdf';

const fmt = n => `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export function descargarRemisionPDF(comprobante) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;

  pdf.setFontSize(16);
  pdf.text('GIOVAL Medicina Estética', 15, y);
  pdf.setFontSize(11);
  y += 8;
  pdf.text(`Remisión ${comprobante.folio}`, 15, y);
  y += 6;
  pdf.text(`Fecha: ${new Date(comprobante.fecha).toLocaleDateString('es-MX')}`, 15, y);
  y += 6;
  pdf.text(`Cliente: ${comprobante.receptor_nombre}`, 15, y);
  y += 10;

  pdf.setFont(undefined, 'bold');
  pdf.text('Descripción', 15, y);
  pdf.text('Cant.', 120, y);
  pdf.text('Precio', 145, y);
  pdf.text('Importe', 175, y);
  pdf.setFont(undefined, 'normal');
  y += 6;
  pdf.line(15, y - 2, 195, y - 2);

  for (const c of comprobante.conceptos) {
    pdf.text(String(c.descripcion).slice(0, 50), 15, y);
    pdf.text(String(c.cantidad), 120, y);
    pdf.text(fmt(c.precio_unitario), 145, y);
    pdf.text(fmt(c.importe), 175, y);
    y += 6;
  }

  y += 4;
  pdf.line(15, y - 2, 195, y - 2);
  pdf.setFont(undefined, 'bold');
  pdf.text(`Total: ${fmt(comprobante.total)}`, 145, y);
  pdf.setFont(undefined, 'normal');
  y += 10;
  pdf.setFontSize(9);
  pdf.text('Este documento no es una factura fiscal (CFDI).', 15, y);

  pdf.save(`${comprobante.folio}.pdf`);
}
```

- [ ] **Step 7: Componente `ComprobanteButtons` (solo remisión por ahora)**

```jsx
// frontend/src/components/ComprobanteButtons.jsx
import { useState, useEffect } from 'react';
import { generarRemision, getComprobantesPorOrigen, getComprobanteConConceptos } from '../api/comprobantes';
import { descargarRemisionPDF } from '../utils/pdfRemision';

export default function ComprobanteButtons({ origen, origenId }) {
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getComprobantesPorOrigen(origen, origenId).then(setComprobantes).catch(() => {});
  }, [origen, origenId]);

  const remisionExistente = comprobantes.find(c => c.tipo === 'remision');

  async function handleRemision() {
    setLoading(true); setError('');
    try {
      const comprobante = remisionExistente
        ? await getComprobanteConConceptos(remisionExistente.id)
        : await generarRemision(origen, origenId);
      descargarRemisionPDF(comprobante);
      if (!remisionExistente) setComprobantes(c => [...c, comprobante]);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar remisión');
    } finally { setLoading(false); }
  }

  return (
    <div className="flex gap-2 items-center">
      <button onClick={handleRemision} disabled={loading}
              className="text-xs px-2.5 py-1 rounded border disabled:opacity-50"
              style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
        {loading ? 'Generando…' : remisionExistente ? `Descargar remisión ${remisionExistente.folio}` : 'Remisión'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
```

Nota: este componente revisa si ya existe un comprobante para este origen (`getComprobantesPorOrigen`) en vez de generar uno nuevo en cada clic — así "Remisión"/"Factura" funcionan también como botón de reimpresión desde el historial, sin duplicar folios para la misma venta.

- [ ] **Step 8: Integrar en `FarmaciaPOS.jsx`**

Modify `frontend/src/pages/farmacia/FarmaciaPOS.jsx` — agregar el import y el estado, y cambiar `handlePagar`:

```js
import ComprobanteButtons from '../../components/ComprobanteButtons';
```

```js
  const [ventaCompletada, setVentaCompletada] = useState(null);
```

Reemplazar el cuerpo de `handlePagar`:

```js
  const handlePagar = async (metodo_pago) => {
    try {
      if (!cajaAbierta) {
        setError('Necesitas abrir caja primero');
        return;
      }

      const venta = await farmaciaAPI.createVenta({});

      for (const item of items) {
        await farmaciaAPI.agregarItemVenta(venta.id, {
          producto_id: item.producto_id,
          cantidad: item.cantidad
        });
      }

      await farmaciaAPI.pagarVenta(venta.id, { metodo_pago });
      setVentaCompletada(venta);
      limpiar();
      setModalPago(false);
    } catch (err) {
      setError(err.message);
    }
  };
```

Agregar, justo antes del `return (` final del componente (reemplaza el bloque de `if (!cajaAbierta) { ... }` para que aparezca también cuando hay una venta completada pendiente de mostrar):

```jsx
  if (ventaCompletada) {
    return (
      <div style={{ padding: '1rem' }}>
        <p style={{ marginBottom: '0.75rem' }}>✓ Venta registrada exitosamente.</p>
        <ComprobanteButtons origen="farmacia_venta" origenId={ventaCompletada.id} />
        <button onClick={() => setVentaCompletada(null)} style={{ marginTop: '1rem' }}>
          Nueva venta
        </button>
      </div>
    );
  }

  if (!cajaAbierta) {
```

- [ ] **Step 9: Verificar que el frontend compila**

Run: `cd ~/elys/frontend && npm run build`
Expected: `✓ built in ...` sin errores.

- [ ] **Step 10: Prueba manual**

Con backend y frontend corriendo, login como `cosmetologa1@elys.com` o admin → Farmacia → abrir caja → POS → agregar un producto → cobrar → confirmar que aparece "✓ Venta registrada exitosamente" con el botón "Remisión" → clic → confirmar que descarga un PDF con folio, producto, cantidad, precio y total correctos.

- [ ] **Step 11: Commit**

```bash
cd ~/elys
git add backend/src/controllers/comprobantesController.js backend/src/routes/comprobantes.js backend/src/index.js frontend/src/api/comprobantes.js frontend/src/utils/pdfRemision.js frontend/src/components/ComprobanteButtons.jsx frontend/src/pages/farmacia/FarmaciaPOS.jsx
git commit -m "feat: remisión end-to-end desde el POS de Farmacia"
```

---

### Task 4: Factura CFDI — backend (Facturapi)

**Prerequisito:** el usuario debe crear una cuenta gratuita en https://www.facturapi.io, copiar su API key de **prueba** (empieza con `sk_test_`), y agregarla al `.env` del backend antes de correr el Step 5 de este task. Sin esa key, el SDK no puede timbrar ni en sandbox.

**Files:**
- Modify: `backend/package.json` (agregar dependencia `facturapi`)
- Modify: `backend/src/services/comprobanteService.js`
- Modify: `backend/src/controllers/comprobantesController.js`
- Modify: `backend/src/routes/comprobantes.js`
- Modify: `backend/.env.example`
- Modify: `backend/src/scripts/test_comprobantes.js`

**Interfaces:**
- Consumes: `construirConceptos`, `datosReceptor`, `guardarDatosFiscales`, `formaPagoSAT` (Task 2); `ConfiguracionFiscal.get()` (Task 1).
- Produces: `generarFactura(origen, origenId, datosFiscales, userId)`; rutas `POST /api/comprobantes/factura`, `GET /api/comprobantes/:id/pdf`.

- [ ] **Step 1: Instalar el SDK**

Run: `cd ~/elys/backend && npm install facturapi`
Expected: se agrega `facturapi` a `package.json` y `package-lock.json`.

- [ ] **Step 2: Agregar las variables de entorno**

Modify `backend/.env.example` — agregar al final:

```
FACTURAPI_MODO=test
FACTURAPI_TEST_KEY=
FACTURAPI_KEY=
```

Modify `backend/.env` (el real, no versionado) — agregar las mismas 3 líneas, con `FACTURAPI_TEST_KEY` igual a la key de prueba obtenida en facturapi.io.

- [ ] **Step 3: Agregar `generarFactura` a `comprobanteService.js`**

Modify `backend/src/services/comprobanteService.js` — agregar al inicio del archivo:

```js
const Facturapi = require('facturapi').default;
const Comprobante = require('../models/comprobante');
const ConfiguracionFiscal = require('../models/configuracionFiscal');
```

Agregar antes de `module.exports`:

```js
function clienteFacturapi() {
  const modo = process.env.FACTURAPI_MODO || 'test';
  const key = modo === 'live' ? process.env.FACTURAPI_KEY : process.env.FACTURAPI_TEST_KEY;
  if (!key) throw new Error(`Falta FACTURAPI_${modo === 'live' ? '' : 'TEST_'}KEY en .env`);
  return new Facturapi(key);
}

async function generarFactura(origen, origenId, datosFiscales, userId) {
  const emisor = await ConfiguracionFiscal.get();
  if (!emisor?.rfc) {
    throw Object.assign(new Error('Configura los datos fiscales de Gioval antes de timbrar facturas'), { status: 400 });
  }

  const receptor = await datosReceptor(origen, origenId);
  if (datosFiscales) await guardarDatosFiscales(receptor, datosFiscales);
  const fiscales = datosFiscales || receptor;

  const conceptos = await construirConceptos(origen, origenId);
  const { subtotal, total } = subtotalYTotal(conceptos);
  const facturapi = clienteFacturapi();

  const customer = await facturapi.customers.create({
    legal_name: fiscales.razon_social_fiscal || receptor.nombre,
    tax_id: fiscales.rfc,
    email: 'facturacion@gioval.mx',
    address: { zip: fiscales.codigo_postal_fiscal },
  });

  const invoice = await facturapi.invoices.create({
    customer: customer.id,
    items: conceptos.map(c => ({
      quantity: c.cantidad,
      product: {
        description: c.descripcion,
        price: parseFloat(c.precio_unitario),
        product_key: '01010101',
        unit_key: 'H87',
        tax_included: false,
      },
    })),
    payment_form: formaPagoSAT(receptor.metodo_pago),
    payment_method: 'PUE',
    use: fiscales.uso_cfdi_default || 'G03',
  });

  const stamped = await facturapi.invoices.stampDraft(invoice.id);
  const folio = await Comprobante.nextFolio('factura');

  return Comprobante.create({
    tipo: 'factura', origen, origen_id: origenId, folio,
    receptor_nombre: fiscales.razon_social_fiscal || receptor.nombre,
    receptor_rfc: fiscales.rfc,
    subtotal, total,
    facturapi_invoice_id: stamped.id,
    uuid_fiscal: stamped.uuid,
    created_by: userId,
  });
}

async function descargarFacturaPDF(comprobante) {
  const facturapi = clienteFacturapi();
  return facturapi.invoices.downloadPdf(comprobante.facturapi_invoice_id);
}
```

Actualizar la línea `module.exports`:

```js
module.exports = {
  construirConceptos, datosReceptor, guardarDatosFiscales, subtotalYTotal, formaPagoSAT,
  generarFactura, descargarFacturaPDF,
};
```

- [ ] **Step 4: Controller y rutas**

Modify `backend/src/controllers/comprobantesController.js` — agregar al import:

```js
const { construirConceptos, datosReceptor, subtotalYTotal, generarFactura, descargarFacturaPDF } = require('../services/comprobanteService');
```

Agregar al final del archivo:

```js
exports.generarFacturaCtrl = async (req, res, next) => {
  try {
    const { origen, origen_id, datos_fiscales } = req.body;
    if (!['farmacia_venta', 'movimiento'].includes(origen) || !origen_id) {
      return res.status(400).json({ error: 'origen y origen_id son requeridos' });
    }
    if (!puedeGenerar(req, origen)) return res.status(403).json({ error: 'Sin permisos' });

    const comprobante = await generarFactura(origen, origen_id, datos_fiscales, req.user.id);
    res.status(201).json(comprobante);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};

exports.descargarPdf = async (req, res, next) => {
  try {
    const comprobante = await require('../models/comprobante').findById(req.params.id);
    if (!comprobante) return res.status(404).json({ error: 'No encontrado' });
    if (comprobante.tipo !== 'factura') return res.status(400).json({ error: 'Solo facturas tienen PDF descargable por esta ruta' });
    const pdfBuffer = await descargarFacturaPDF(comprobante);
    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (e) { next(e); }
};
```

Modify `backend/src/routes/comprobantes.js`:

```js
const router = require('express').Router();
const ctrl = require('../controllers/comprobantesController');

router.post('/remision', ctrl.generarRemision);
router.post('/factura', ctrl.generarFacturaCtrl);
router.get('/origen/:origen/:origenId', ctrl.getPorOrigen);
router.get('/:id/pdf', ctrl.descargarPdf);
router.get('/:id', ctrl.getConceptos);

module.exports = router;
```

(El orden importa: `/:id/pdf` debe ir antes de `/:id` para que Express no lo confunda con el parámetro `id`.)

- [ ] **Step 5: Extender el script de verificación con timbrado real en sandbox**

Modify `backend/src/scripts/test_comprobantes.js` — agregar antes de `await pool.end();`:

```js
  const { generarFactura } = require('../services/comprobanteService');
  const ConfiguracionFiscalModel = require('../models/configuracionFiscal');

  await ConfiguracionFiscalModel.update({
    razon_social: 'GIOVAL MEDICINA ESTETICA SC', rfc: 'GME200101AAA',
    regimen_fiscal: '601', codigo_postal: '58260',
  });

  if (ventaConItems.length) {
    const factura = await generarFactura('farmacia_venta', ventaConItems[0].venta_id, {
      rfc: 'XAXX010101000', razon_social_fiscal: 'PUBLICO EN GENERAL',
      regimen_fiscal_receptor: '616', codigo_postal_fiscal: '58260', uso_cfdi_default: 'S01',
    }, null);
    assert.ok(factura.uuid_fiscal, 'la factura no regresó uuid_fiscal — el timbrado no se completó');
    console.log(`✓ Factura timbrada en sandbox: ${factura.folio} / UUID ${factura.uuid_fiscal}`);
  } else {
    console.log('⚠ sin ventas de farmacia con items, se omite la prueba de timbrado (no es error)');
  }
```

- [ ] **Step 6: Ejecutar el script con la API key de prueba ya configurada**

Run: `cd ~/elys/backend && node src/scripts/test_comprobantes.js`
Expected: `✓ Factura timbrada en sandbox: F-000001 / UUID ...` además de los mensajes anteriores. Si falla con "Falta FACTURAPI_TEST_KEY en .env", confirmar que el usuario ya creó su cuenta y pegó la key.

- [ ] **Step 7: Commit**

```bash
cd ~/elys
git add backend/package.json backend/package-lock.json backend/.env.example backend/src/services/comprobanteService.js backend/src/controllers/comprobantesController.js backend/src/routes/comprobantes.js backend/src/scripts/test_comprobantes.js
git commit -m "feat: factura CFDI vía Facturapi (modo sandbox)"
```

---

### Task 5: Factura CFDI — frontend (captura de datos fiscales)

**Files:**
- Create: `frontend/src/components/DatosFiscalesModal.jsx`
- Modify: `frontend/src/components/ComprobanteButtons.jsx`
- Modify: `frontend/src/api/comprobantes.js`

**Interfaces:**
- Consumes: `POST /api/comprobantes/factura` (Task 4).
- Produces: `DatosFiscalesModal` con prop `onConfirmar(datosFiscales)`.

- [ ] **Step 1: Agregar `generarFactura` a la API**

Modify `frontend/src/api/comprobantes.js` — agregar:

```js
export const generarFactura = (origen, origen_id, datos_fiscales) =>
  api.post('/comprobantes/factura', { origen, origen_id, datos_fiscales }).then(r => r.data);
```

- [ ] **Step 2: Modal de datos fiscales**

```jsx
// frontend/src/components/DatosFiscalesModal.jsx
import { useState } from 'react';

const REGIMENES = [
  { value: '601', label: '601 · General de Ley Personas Morales' },
  { value: '603', label: '603 · Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 · Sueldos y Salarios' },
  { value: '612', label: '612 · Personas Físicas con Actividades Empresariales' },
  { value: '616', label: '616 · Sin obligaciones fiscales' },
  { value: '621', label: '621 · Incorporación Fiscal' },
  { value: '626', label: '626 · Régimen Simplificado de Confianza' },
];

const USOS_CFDI = [
  { value: 'G03', label: 'G03 · Gastos en general' },
  { value: 'S01', label: 'S01 · Sin efectos fiscales' },
  { value: 'P01', label: 'P01 · Por definir' },
];

export default function DatosFiscalesModal({ onClose, onConfirmar }) {
  const [form, setForm] = useState({
    rfc: '', razon_social_fiscal: '', regimen_fiscal_receptor: '616',
    codigo_postal_fiscal: '', uso_cfdi_default: 'G03',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.rfc || !form.razon_social_fiscal || !form.codigo_postal_fiscal) {
      setError('RFC, razón social y código postal son obligatorios.');
      return;
    }
    setLoading(true); setError('');
    try {
      await onConfirmar(form);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar la factura');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3"
            style={{ borderTop: '4px solid var(--color-accent)' }}>
        <h2 className="font-bold text-base" style={{ color: 'var(--color-dark)' }}>Datos fiscales para la factura</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">RFC *</label>
          <input type="text" value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())}
                 className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Razón social / Nombre completo *</label>
          <input type="text" value={form.razon_social_fiscal} onChange={e => set('razon_social_fiscal', e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Código postal fiscal *</label>
          <input type="text" value={form.codigo_postal_fiscal} onChange={e => set('codigo_postal_fiscal', e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Régimen fiscal</label>
          <select value={form.regimen_fiscal_receptor} onChange={e => set('regimen_fiscal_receptor', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }}>
            {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Uso de CFDI</label>
          <select value={form.uso_cfdi_default} onChange={e => set('uso_cfdi_default', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }}>
            {USOS_CFDI.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--color-primary)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
                  className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
            {loading ? 'Timbrando…' : 'Generar factura'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Extender `ComprobanteButtons` con el botón de factura**

Modify `frontend/src/components/ComprobanteButtons.jsx` completo:

```jsx
import { useState, useEffect } from 'react';
import { generarRemision, generarFactura, getComprobantesPorOrigen, getComprobanteConConceptos } from '../api/comprobantes';
import { descargarRemisionPDF } from '../utils/pdfRemision';
import DatosFiscalesModal from './DatosFiscalesModal';

export default function ComprobanteButtons({ origen, origenId }) {
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarModalFiscal, setMostrarModalFiscal] = useState(false);

  useEffect(() => {
    getComprobantesPorOrigen(origen, origenId).then(setComprobantes).catch(() => {});
  }, [origen, origenId]);

  const remisionExistente = comprobantes.find(c => c.tipo === 'remision');
  const facturaExistente = comprobantes.find(c => c.tipo === 'factura');

  async function handleRemision() {
    setLoading(true); setError('');
    try {
      const comprobante = remisionExistente
        ? await getComprobanteConConceptos(remisionExistente.id)
        : await generarRemision(origen, origenId);
      descargarRemisionPDF(comprobante);
      if (!remisionExistente) setComprobantes(c => [...c, comprobante]);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar remisión');
    } finally { setLoading(false); }
  }

  async function handleConfirmarFactura(datosFiscales) {
    const comprobante = await generarFactura(origen, origenId, datosFiscales);
    setComprobantes(c => [...c, comprobante]);
    setMostrarModalFiscal(false);
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <button onClick={handleRemision} disabled={loading}
              className="text-xs px-2.5 py-1 rounded border disabled:opacity-50"
              style={{ borderColor: 'var(--color-sage)', color: 'var(--color-dark)' }}>
        {loading ? 'Generando…' : remisionExistente ? `Descargar remisión ${remisionExistente.folio}` : 'Remisión'}
      </button>

      {facturaExistente ? (
        <a href={`/api/comprobantes/${facturaExistente.id}/pdf`} target="_blank" rel="noreferrer"
           className="text-xs px-2.5 py-1 rounded border" style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
          Descargar factura {facturaExistente.folio}
        </a>
      ) : (
        <button onClick={() => setMostrarModalFiscal(true)} disabled={loading}
                className="text-xs px-2.5 py-1 rounded border disabled:opacity-50"
                style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
          Factura
        </button>
      )}

      {error && <span className="text-xs text-red-500">{error}</span>}

      {mostrarModalFiscal && (
        <DatosFiscalesModal onClose={() => setMostrarModalFiscal(false)} onConfirmar={handleConfirmarFactura} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verificar que el frontend compila**

Run: `cd ~/elys/frontend && npm run build`
Expected: `✓ built in ...` sin errores.

- [ ] **Step 5: Prueba manual**

Con backend+frontend corriendo y `FACTURAPI_TEST_KEY` configurada → repetir una venta en el POS → en la pantalla de venta completada, clic en "Factura" → llenar el modal con un RFC de prueba (ej. `XAXX010101000` / "PUBLICO EN GENERAL" / CP `58260`) → confirmar que aparece "Descargar factura F-00000X" → clic → confirmar que abre/descarga un PDF real (el de Facturapi, con sello/QR de timbre de prueba).

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add frontend/src/components/DatosFiscalesModal.jsx frontend/src/components/ComprobanteButtons.jsx frontend/src/api/comprobantes.js
git commit -m "feat: captura de datos fiscales y descarga de factura CFDI"
```

---

### Task 6: Configuración Fiscal (admin)

**Files:**
- Create: `backend/src/controllers/configuracionFiscalController.js`
- Create: `backend/src/routes/configuracion-fiscal.js`
- Modify: `backend/src/index.js`
- Create: `frontend/src/api/configuracionFiscal.js`
- Create: `frontend/src/pages/ConfiguracionFiscalPage.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `ConfiguracionFiscal.get()/update()` (Task 1).
- Produces: `GET/PUT /api/configuracion-fiscal`; ruta `/configuracion-fiscal`.

- [ ] **Step 1: Controller**

```js
// backend/src/controllers/configuracionFiscalController.js
const ConfiguracionFiscal = require('../models/configuracionFiscal');

exports.get = async (req, res, next) => {
  try {
    res.json(await ConfiguracionFiscal.get());
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    res.json(await ConfiguracionFiscal.update(req.body));
  } catch (e) { next(e); }
};
```

- [ ] **Step 2: Rutas**

```js
// backend/src/routes/configuracion-fiscal.js
const router = require('express').Router();
const ctrl = require('../controllers/configuracionFiscalController');

router.get('/', ctrl.get);
router.put('/', ctrl.update);

module.exports = router;
```

- [ ] **Step 3: Registrar en `index.js`**

Modify `backend/src/index.js` — agregar después de la línea de `/api/comprobantes`:

```js
app.use('/api/configuracion-fiscal', authMiddleware, require('./routes/configuracion-fiscal'));
```

- [ ] **Step 4: API frontend**

```js
// frontend/src/api/configuracionFiscal.js
import api from './client';

export const getConfiguracionFiscal = () =>
  api.get('/configuracion-fiscal').then(r => r.data);

export const updateConfiguracionFiscal = (data) =>
  api.put('/configuracion-fiscal', data).then(r => r.data);
```

- [ ] **Step 5: Página de configuración**

```jsx
// frontend/src/pages/ConfiguracionFiscalPage.jsx
import { useState, useEffect } from 'react';
import { getConfiguracionFiscal, updateConfiguracionFiscal } from '../api/configuracionFiscal';

export default function ConfiguracionFiscalPage() {
  const [form, setForm] = useState({ razon_social: '', rfc: '', regimen_fiscal: '', codigo_postal: '' });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    getConfiguracionFiscal().then(d => {
      if (d) setForm({
        razon_social: d.razon_social || '', rfc: d.rfc || '',
        regimen_fiscal: d.regimen_fiscal || '', codigo_postal: d.codigo_postal || '',
      });
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setMensaje('');
    try {
      await updateConfiguracionFiscal(form);
      setMensaje('Guardado correctamente.');
    } catch {
      setMensaje('Error al guardar.');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--color-dark)' }}>Configuración Fiscal</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-5 space-y-4" style={{ borderColor: 'var(--color-sage)' }}>
        {mensaje && <p className="text-sm" style={{ color: 'var(--color-accent)' }}>{mensaje}</p>}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Razón social</label>
          <input type="text" value={form.razon_social} onChange={e => set('razon_social', e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">RFC</label>
          <input type="text" value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())}
                 className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Régimen fiscal (clave SAT)</label>
          <input type="text" value={form.regimen_fiscal} onChange={e => set('regimen_fiscal', e.target.value)}
                 placeholder="ej. 601" className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Código postal</label>
          <input type="text" value={form.codigo_postal} onChange={e => set('codigo_postal', e.target.value)}
                 className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: 'var(--color-primary)' }} />
        </div>
        <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}>
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Ruta + nav en `App.jsx`**

Modify `frontend/src/App.jsx` — agregar el import junto a los demás `import ... Page from './pages/...'`:

```js
import ConfiguracionFiscalPage from './pages/ConfiguracionFiscalPage';
```

Agregar la ruta junto a las demás rutas solo-admin (al lado de `/tratamientos` o `/finanzas`):

```jsx
<Route path="/configuracion-fiscal" element={<ConfiguracionFiscalPage />} />
```

Agregar un link de navegación condicional `rol === 'admin'` (mismo patrón que el resto de items solo-admin del navbar existente) apuntando a `/configuracion-fiscal`, con texto "Config. Fiscal".

- [ ] **Step 7: Verificar que el frontend compila**

Run: `cd ~/elys/frontend && npm run build`
Expected: `✓ built in ...` sin errores.

- [ ] **Step 8: Prueba manual**

Login admin → nuevo link "Config. Fiscal" en el navbar → llenar razón social/RFC/régimen/CP de Gioval → Guardar → recargar la página → confirmar que persistió.

- [ ] **Step 9: Commit**

```bash
cd ~/elys
git add backend/src/controllers/configuracionFiscalController.js backend/src/routes/configuracion-fiscal.js backend/src/index.js frontend/src/api/configuracionFiscal.js frontend/src/pages/ConfiguracionFiscalPage.jsx frontend/src/App.jsx
git commit -m "feat: página de Configuración Fiscal (admin)"
```

---

### Task 7: Integración en Caja (cobro de tratamientos)

**Files:**
- Modify: `frontend/src/components/finanzas/CajaPanel.jsx`

**Interfaces:**
- Consumes: `ComprobanteButtons` (Tasks 3 y 5) — ya soporta `origen='movimiento'` sin cambios de backend, porque `comprobanteService` ya maneja ambos orígenes desde el Task 2.

- [ ] **Step 1: Importar y montar `ComprobanteButtons` en la lista de movimientos**

Modify `frontend/src/components/finanzas/CajaPanel.jsx` — agregar el import junto a los demás:

```js
import ComprobanteButtons from '../ComprobanteButtons';
```

Modify el bloque `{movimientos.map(m => ( ... ))}` — agregar una fila extra debajo de cada movimiento de tipo `ingreso`, dentro del mismo `<div key={m.id} ...>` (después del `<div className="text-right flex-shrink-0">...</div>` existente, antes de cerrar el div contenedor):

```jsx
              <div key={m.id} className="px-5 py-2.5 flex items-center gap-3 flex-wrap">
                <span className="text-base leading-none"
                      style={{ color: m.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                  {m.tipo === 'ingreso' ? '✓' : '↓'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-dark)' }}>
                    {m.paciente_nombre
                      ? <><span className="font-medium">{m.paciente_nombre.split(' ')[0]}</span> · {m.concepto}</>
                      : m.concepto
                    }
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold tabular-nums"
                     style={{ color: m.tipo === 'ingreso' ? '#4a7c6a' : '#c0675a' }}>
                    {fmt(m.monto)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.forma_pago} · {fmtHora(m.created_at)}
                  </p>
                </div>
                {m.tipo === 'ingreso' && (
                  <div className="w-full">
                    <ComprobanteButtons origen="movimiento" origenId={m.id} />
                  </div>
                )}
              </div>
```

(Esto reemplaza el bloque equivalente existente — mismo contenido, solo se agregó `flex-wrap` al contenedor y el bloque condicional de `ComprobanteButtons` al final.)

- [ ] **Step 2: Verificar que el frontend compila**

Run: `cd ~/elys/frontend && npm run build`
Expected: `✓ built in ...` sin errores.

- [ ] **Step 3: Prueba manual**

Login admin o un usuario con `puede_caja` → Finanzas → Caja → cobrar rápido una cita pendiente → confirmar que en "Cobros y movimientos de hoy" el movimiento recién creado muestra los botones "Remisión" / "Factura" → generar una remisión → confirmar que el PDF trae el nombre del tratamiento y el monto correctos.

- [ ] **Step 4: Commit**

```bash
cd ~/elys
git add frontend/src/components/finanzas/CajaPanel.jsx
git commit -m "feat: remisión y factura disponibles desde Caja de tratamientos"
```

---

### Task 8: Deploy

**Files:** ninguno nuevo — usa `~/elys/deploy.sh` existente.

- [ ] **Step 1: Confirmar que `FACTURAPI_TEST_KEY` (y opcionalmente `FACTURAPI_MODO=test`) están en el `.env` del servidor**

El `.env` de producción no se sincroniza por `deploy.sh` (excluido a propósito) — hay que agregar las variables manualmente una vez:

Run: `ssh root@62.238.3.136 "echo 'FACTURAPI_MODO=test' >> /root/elys/backend/.env && echo 'FACTURAPI_TEST_KEY=<la_key_real>' >> /root/elys/backend/.env"`

- [ ] **Step 2: Rebuild del frontend y deploy**

Run: `cd ~/elys/frontend && npm run build` (ya verificado en tasks anteriores, se repite por ser el paso que toma `deploy.sh`)
Run: `cd ~/elys && ./deploy.sh`
Expected: sincroniza backend + `frontend/dist/` y reinicia PM2 `elys-backend` — la migración 030 se aplica sola al reiniciar.

- [ ] **Step 3: Verificar en producción**

Login en `http://62.238.3.136:8088` como admin → Configuración Fiscal → confirmar que la página carga (datos vacíos al inicio) → Farmacia → POS → repetir una venta de prueba → generar remisión → confirmar que descarga el PDF correctamente contra producción.
