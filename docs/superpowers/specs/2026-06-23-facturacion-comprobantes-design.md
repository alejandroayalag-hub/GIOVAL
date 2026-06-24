# Remisiones y Facturas CFDI — Design

## Contexto

Hoy, ni el POS de Farmacia ni el cobro de tratamientos en Caja generan ningún comprobante — el cajero cobra y no queda ningún documento entregable al cliente/paciente. La Dra. Giovanna pidió que el POS pueda generar **remisiones** (comprobante de venta sin validez fiscal) y **facturas** (CFDI, factura electrónica timbrada ante el SAT), y al definir alcance se amplió a también cubrir los cobros de tratamientos en el módulo Caja — son dos orígenes de venta distintos (`farmacia_ventas` y `movimientos`) que deben producir el mismo tipo de comprobante.

Gioval Medicina Estética, S.C. no tiene hoy nada del lado fiscal listo: ni RFC/régimen fiscal confirmado, ni e.firma/CSD del SAT, ni cuenta con un PAC (proveedor autorizado de timbrado). Por eso la factura CFDI se construye contra el modo **sandbox** del PAC elegido — el flujo completo queda funcional y probado, y pasar a timbrado real es un cambio de configuración (API key + modo), no de código. Ver sección "Camino a producción" al final.

**PAC elegido: Facturapi.** SDK oficial de Node, API REST moderna, modo test (`sk_test_...`) y modo live (`sk_live_...`) intercambiables solo cambiando la API key, ~$299 MXN/mes + consumo por timbre en producción. Facturapi resguarda el CSD que el cliente suba a su panel — nosotros nunca manejamos certificados SAT directamente.

## Objetivo

Desde el POS de Farmacia y desde el módulo Caja (cobro de tratamientos), el usuario puede generar:
- **Remisión** — PDF sin validez fiscal, disponible siempre, sin dependencias externas.
- **Factura CFDI** — timbrada vía Facturapi (sandbox por ahora), pidiendo los datos fiscales del receptor si no los tiene guardados.

Ambas quedan disponibles también después, desde el historial de ventas/cobros (no solo en el momento del cobro).

## Modelo de datos

Migración `030_comprobantes.sql`:

```sql
-- Comprobantes: remisión o factura, de cualquiera de los dos orígenes de venta
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
  pdf_path         TEXT,
  facturapi_invoice_id VARCHAR(50),
  uuid_fiscal      VARCHAR(50),
  estado           VARCHAR(20)  NOT NULL DEFAULT 'generado' CHECK (estado IN ('generado', 'cancelado')),
  created_by       INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comprobantes_origen ON comprobantes(origen, origen_id);

-- Configuración fiscal del emisor (Gioval) — un solo registro
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

-- Datos fiscales del receptor, capturados solo cuando se pide factura
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

`origen_id` apunta a `farmacia_ventas.id` o a `movimientos.id` según `origen` — no hay FK porque son dos tablas distintas (patrón ya usado en el código, ej. `notas_visita.tipo`). `folio` es el número visible al cliente (independiente del id interno): `R-000123` para remisiones, `F-000045` para facturas, contador propio por tipo.

## Backend — capa común

**`models/comprobante.js`** — `create(data)`, `findById(id)`, `findByOrigen(origen, origenId)`, `nextFolio(tipo)` (cuenta filas existentes del tipo + 1, formateado).

**`models/configuracionFiscal.js`** — `get()` (siempre la única fila), `update(data)`.

**`services/comprobanteService.js`** — el corazón del feature, agnóstico de origen:

```js
async function construirConceptos(origen, origenId) {
  if (origen === 'farmacia_venta') {
    const { rows } = await pool.query(
      `SELECT fp.nombre AS descripcion, fiv.cantidad, fiv.precio_unitario, fiv.subtotal AS importe
       FROM farmacia_items_venta fiv JOIN farmacia_productos fp ON fp.id = fiv.producto_id
       WHERE fiv.venta_id = $1`, [origenId]
    );
    return rows;
  }
  // origen === 'movimiento': un solo concepto, el de la cita/tratamiento cobrado
  const { rows } = await pool.query(
    `SELECT COALESCE(t.nombre, m.concepto) AS descripcion, 1 AS cantidad,
            m.monto AS precio_unitario, m.monto AS importe
     FROM movimientos m
     LEFT JOIN citas ci ON m.cita_id = ci.id
     LEFT JOIN tratamientos t ON ci.tratamiento_id = t.id
     WHERE m.id = $1`, [origenId]
  );
  return rows;
}

async function datosReceptor(origen, origenId) {
  // farmacia_venta: cliente_id -> farmacia_clientes, o paciente_id -> pacientes
  // movimiento: cita_id -> citas.paciente_id -> pacientes
  // devuelve { nombre, rfc, razon_social_fiscal, regimen_fiscal_receptor, codigo_postal_fiscal, uso_cfdi_default, tablaOrigen, idOrigen }
  // para poder guardar datos fiscales nuevos de vuelta en la tabla correcta
}

async function generarRemision(origen, origenId, userId) {
  const conceptos = await construirConceptos(origen, origenId);
  const folio = await Comprobante.nextFolio('remision');
  const pdfPath = await pdfRemision(folio, conceptos, await datosReceptor(origen, origenId)); // jsPDF, guarda en backend/uploads/comprobantes/
  return Comprobante.create({ tipo: 'remision', origen, origen_id: origenId, folio, pdf_path: pdfPath, ...subtotalYTotal(conceptos), created_by: userId, receptor_nombre: ... });
}

async function generarFactura(origen, origenId, datosFiscales, userId) {
  // datosFiscales: { rfc, razon_social_fiscal, regimen_fiscal_receptor, codigo_postal_fiscal, uso_cfdi_default }
  // si vienen, se guardan de vuelta en farmacia_clientes/pacientes para la próxima vez
  const conceptos = await construirConceptos(origen, origenId);
  const metodoPagoReal = await metodoPagoDelOrigen(origen, origenId); // farmacia_ventas.metodo_pago o movimientos.forma_pago
  const emisor = await ConfiguracionFiscal.get();
  const facturapi = new Facturapi(process.env.FACTURAPI_MODO === 'live' ? process.env.FACTURAPI_KEY : process.env.FACTURAPI_TEST_KEY);
  const customer = await facturapi.customers.create({
    legal_name: datosFiscales.razon_social_fiscal, tax_id: datosFiscales.rfc,
    address: { zip: datosFiscales.codigo_postal_fiscal }, ... 
  });
  const invoice = await facturapi.invoices.create({
    customer: customer.id,
    items: conceptos.map(c => ({ quantity: c.cantidad, product: { description: c.descripcion, price: c.precio_unitario, product_key: '01010101', unit_key: 'H87', tax_included: false } })),
    payment_form: FORMA_PAGO_SAT[metodoPagoReal] || '99', // mapeo: efectivo->01, transferencia->03, tarjeta->04, otro->99 (No identificado)
    payment_method: 'PUE', use: datosFiscales.uso_cfdi_default || 'G03',
  });
  const stamped = await facturapi.invoices.stampDraft(invoice.id);
  const folio = await Comprobante.nextFolio('factura');
  return Comprobante.create({ tipo: 'factura', origen, origen_id: origenId, folio, facturapi_invoice_id: stamped.id, uuid_fiscal: stamped.uuid, ...subtotalYTotal(conceptos), created_by: userId, receptor_nombre: datosFiscales.razon_social_fiscal, receptor_rfc: datosFiscales.rfc });
}
```

`product_key: '01010101'` ("No existe en el catálogo") es un placeholder válido para timbrar en sandbox sin frenar el desarrollo — antes de ir a producción real, vale la pena que el contable de Gioval confirme las claves SAT correctas para productos de farmacia y servicios médicos (no bloquea esta implementación, es un ajuste de configuración posterior).

**Controllers/rutas:**
```
POST /api/comprobantes/remision   { origen, origen_id }
POST /api/comprobantes/factura    { origen, origen_id, datos_fiscales? }
GET  /api/comprobantes/origen/:origen/:origenId   -> comprobantes ya generados para esa venta/cobro
GET  /api/comprobantes/:id/pdf    -> descarga (remisión: archivo local; factura: proxy a Facturapi downloadPdf)
```
Permisos: mismos roles que ya cobran en cada módulo — `admin` y `FARMACISTA` para origen `farmacia_venta`; `admin` y `asistente_general` (o `puede_caja=true`) para origen `movimiento`.

**`routes/configuracion-fiscal.js`** — `GET/PUT /api/configuracion-fiscal`, solo `admin`.

## Frontend

- **`api/comprobantes.js`** — `generarRemision`, `generarFactura`, `getComprobantesPorOrigen`, `descargarPdf`.
- **`components/ComprobanteButtons.jsx`** — recibe `origen` + `origenId`, muestra "Generar Remisión" / "Generar Factura" (o los comprobantes ya generados con link de descarga, si ya existen). Se monta en:
  - `FarmaciaPOS.jsx`, justo después de completar el pago.
  - `FarmaciaInventario.jsx` o donde viva el historial de ventas — para generar/reimprimir después.
  - `CajaPanel.jsx`, junto a cada cobro (pendiente o ya cobrado).
- **`components/DatosFiscalesModal.jsx`** — se abre al dar clic en "Generar Factura" si el receptor no tiene RFC guardado: captura RFC, razón social, código postal, régimen fiscal (select con los valores SAT más comunes para personas físicas/morales), uso de CFDI (select, default "G03 Gastos en general"). Al guardar, llama a `generarFactura` con esos datos.
- **`pages/ConfiguracionFiscalPage.jsx`** (solo admin) — formulario simple para los 4 campos del emisor. Nuevo ítem en navbar/menú admin, o tab dentro de una página de configuración existente.

## Manejo de errores

- Si Facturapi rechaza el timbrado (RFC inválido, datos fiscales incompletos), el error de su API se muestra tal cual al usuario (Facturapi ya da mensajes claros en español) — no se inventa un mensaje genérico que oculte la causa real.
- Generar una remisión nunca debe fallar por causas fiscales — es una operación puramente local (PDF + base de datos), sin llamada externa.
- Si `configuracion_fiscal` no tiene RFC del emisor capturado todavía, "Generar Factura" debe bloquear con un mensaje claro ("Configura los datos fiscales de Gioval antes de timbrar facturas") en vez de fallar a medias contra Facturapi.

## Testing

Sin framework de tests instalado (igual que el resto del backend) — verificación con un script `assert`-based:
- `backend/src/scripts/test_comprobantes.js`: genera una remisión de una venta de farmacia de prueba y de un movimiento de prueba (confirma que ambos orígenes producen conceptos correctos), genera una factura en modo test contra el sandbox real de Facturapi (confirma que el flujo completo de timbrado funciona de punta a punta, no solo que el código compila) y limpia los datos de prueba al final.

## Camino a producción (depende de la Dra. Giovanna, no de código)

1. Confirmar/tramitar RFC y régimen fiscal de Gioval Medicina Estética, S.C. ante el SAT (probablemente ya existe, solo falta el dato exacto).
2. Tramitar e.firma y descargar el CSD vigente desde el portal del SAT.
3. Crear una cuenta de Facturapi (plan con timbres, ~$299 MXN/mes + consumo) y subir el CSD ahí desde su panel.
4. Capturar los datos del emisor en la página de Configuración Fiscal del sistema (razón social, RFC, régimen, CP).
5. Cambiar `FACTURAPI_MODO=live` y `FACTURAPI_KEY` (la real, no la de prueba) en el `.env` del servidor y reiniciar el backend.

Ningún paso de esta lista requiere tocar código — es exactamente el punto de construir contra el sandbox desde ahora.
