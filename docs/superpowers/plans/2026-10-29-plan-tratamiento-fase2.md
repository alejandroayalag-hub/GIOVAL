# Plan de tratamiento — Fase 2 (promociones, presupuesto firmado, CI por tratamiento, bloqueo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gio da de alta promociones; recepción arma un presupuesto desde Sugeridos que la paciente firma (aceptación de costo); lo aceptado pasa a A realizar y pide el consentimiento del tratamiento; el flujo no deja "⚡ Iniciar procedimiento" sin presupuesto y consentimiento firmados.

**Architecture:** Migración 051 (promociones, presupuestos, items, ligas). Precios y descuentos se calculan **en el servidor** (`services/presupuestos.js`) a partir de `tratamientos.precio` y promociones vigentes; el frontend usa la misma fórmula solo para vista previa. El bloqueo vive en `services/requisitosProcedimiento.js`, usado por `flujoController.avanzar` y por un endpoint de consulta.

**Tech Stack:** Node/Express + pg, React + Vite + Tailwind. Tests: `node backend/src/scripts/test_*.js` (assert + BD local) y `node frontend/src/utils/*.test.js`.

**Spec:** `docs/superpowers/specs/2026-10-29-plan-tratamiento-presupuesto-design.md` (Fase 2). Fase 1 ya en prod (mig 050).

## Global Constraints

- Migración `backend/src/db/migrations/051_presupuestos_promociones.sql`, idempotente; se aplica sola al arrancar el backend.
- Modalidad por tratamiento: exactamente `por_sesion | completo`.
- Promoción: un solo `descuento_pct` (0 < pct ≤ 100), vigente si `activo AND fecha_inicio <= fecha <= fecha_fin` y el tratamiento está en `promocion_tratamientos`; con `solo_completo=true` solo aplica a modalidad `completo`.
- Fórmula (única, backend y preview): `subtotal = round2(precio_unitario * sesiones * (1 - descuento_pct/100))`; `total = Σ subtotal`. `precio_unitario` = `tratamientos.precio` al momento de firmar (congelado).
- Tratamiento sin `precio` → no se puede presupuestar (400 `'<nombre> no tiene precio en el catálogo'`).
- Presupuesto firmado no se edita (no hay PUT). Firma = canvas dataURL, se guarda cifrada con `utils/cifrado.encrypt` (igual que consentimientos), más `ip` y `user_agent`. Sin INE.
- Roles: promociones escribir solo `admin` (leer: admin, asistente_general, asistente_medico); presupuestos crear/leer: `admin, asistente_general, asistente_medico`; CI por tratamiento: mismos roles que hoy firman (`admin, asistente_medico, cosmetista`).
- Exentos del bloqueo (ni presupuesto ni CI): tratamiento `nombre ILIKE 'valoraci%'`, `'Cita de seguimiento'`, `'Anticipo para reservar cita'`. Tratamiento sin plantilla de CI activa (`consentimientos.tratamiento_id = t.id AND activo`) exige presupuesto pero no CI.
- El bloqueo aplica en `flujoController.avanzar` cuando `estatus = 'en_consultorio'` (→ en_procedimiento). 409 con `{ error, faltan: string[], paciente_id, cita_id }`; `faltan ⊆ ['tratamiento','presupuesto','consentimiento']`.
- Lo no aceptado se queda `sugerido`.

## Review Focus

1. Cliente manda precio/descuento alterado o promo vencida/de otro tratamiento → el servidor ignora lo del cliente y recalcula o rechaza. Test en Task 3.
2. Promo `solo_completo` con modalidad `por_sesion` → no se aplica (400 si se pide). Test en Task 2/3.
3. Presupuesto con plan de otro paciente o plan ya `aceptado` → 400, nada se guarda (transacción). Test en Task 3.
4. Cita en consultorio sin plan ligado pero con exactamente un plan aceptado del mismo tratamiento → se liga sola y pasa si tiene CI; con 2 → bloquea pidiendo presupuesto/elegir. Test en Task 4.
5. Cita de valoración / seguimiento → nunca bloqueada. Test en Task 4.

---

### Task 1: Migración 051

**Files:** Create `backend/src/db/migrations/051_presupuestos_promociones.sql`; Test `backend/src/scripts/test_presupuestos.js` (nuevo; Tasks 2–4 le agregan casos)

**Interfaces — Produces:**
- `promociones(id SERIAL PK, nombre VARCHAR(150) NOT NULL, descuento_pct NUMERIC(5,2) NOT NULL CHECK (descuento_pct > 0 AND descuento_pct <= 100), fecha_inicio DATE NOT NULL, fecha_fin DATE NOT NULL CHECK (fecha_fin >= fecha_inicio), solo_completo BOOLEAN NOT NULL DEFAULT false, activo BOOLEAN NOT NULL DEFAULT true, created_by FK usuarios, created_at)`
- `promocion_tratamientos(promocion_id FK promociones ON DELETE CASCADE, tratamiento_id FK tratamientos ON DELETE CASCADE, PK(promocion_id, tratamiento_id))`
- `presupuestos(id SERIAL PK, paciente_id FK pacientes ON DELETE CASCADE NOT NULL, fecha DATE NOT NULL DEFAULT CURRENT_DATE, total NUMERIC(12,2) NOT NULL, firma TEXT NOT NULL, firmado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ip TEXT, user_agent TEXT, created_by FK usuarios, created_at)`
- `presupuesto_items(id SERIAL PK, presupuesto_id FK presupuestos ON DELETE CASCADE NOT NULL, plan_tratamiento_id FK plan_tratamientos NOT NULL, modalidad VARCHAR(12) NOT NULL CHECK IN ('por_sesion','completo'), sesiones INT NOT NULL CHECK (>=1), precio_unitario NUMERIC(10,2) NOT NULL, promocion_id FK promociones ON DELETE SET NULL, descuento_pct NUMERIC(5,2) NOT NULL DEFAULT 0, subtotal NUMERIC(12,2) NOT NULL)`
- `plan_tratamientos.presupuesto_item_id INT NULL FK presupuesto_items ON DELETE SET NULL`, `plan_tratamientos.consentimiento_firmado_id INT NULL FK consentimientos_firmados ON DELETE SET NULL`, `consentimientos_firmados.plan_tratamiento_id INT NULL FK plan_tratamientos ON DELETE SET NULL`

- [ ] **Step 1:** test con `assert`: existen las columnas `promociones.solo_completo`, `presupuesto_items.modalidad`, `plan_tratamientos.presupuesto_item_id`, `plan_tratamientos.consentimiento_firmado_id`, `consentimientos_firmados.plan_tratamiento_id`; insertar promoción con `descuento_pct=0` viola CHECK.
- [ ] **Step 2:** correr `node backend/src/scripts/test_presupuestos.js` → FAIL.
- [ ] **Step 3:** escribir migración; aplicarla con `node -e "require('dotenv').config({path:'backend/.env'});require('./backend/src/db/migrate')().then(()=>process.exit(0))"`.
- [ ] **Step 4:** test → PASS. **Step 5:** commit `feat(db): migración 051 presupuestos y promociones`.

### Task 2: Promociones (backend)

**Files:** Create `backend/src/services/promociones.js`, `backend/src/routes/promociones.js` (registrar `/api/promociones` con `authMiddleware`); Test `test_presupuestos.js`

**Interfaces — Produces:**
- `calcularItem({ precio_unitario, sesiones, descuento_pct }) -> { subtotal }` (fórmula de Global Constraints).
- `async promosVigentes(tratamientoIds: number[], fecha: 'YYYY-MM-DD') -> Promo[]` donde `Promo = { id, nombre, descuento_pct, solo_completo, fecha_inicio, fecha_fin, tratamiento_ids: number[] }` (solo activas y vigentes en `fecha` que incluyan alguno de los ids).
- `async promoAplicable(promocionId, tratamientoId, modalidad, fecha) -> Promo|null` (null si no existe, no vigente, no incluye el tratamiento, o `solo_completo` con `por_sesion`).
- `async listar() -> Promo[]` (todas, más recientes primero), `async crear(data, userId)`, `async actualizar(id, data)`, `async desactivar(id)` (soft: `activo=false`). `data = { nombre, descuento_pct, fecha_inicio, fecha_fin, solo_completo, tratamiento_ids }`; crear/actualizar reemplazan `promocion_tratamientos` en transacción; validan nombre, pct, fechas, ≥1 tratamiento → lanzan `Error` con `status=400`.
- Rutas: `GET /` (lectura), `GET /vigentes?tratamientos=1,2&fecha=` (lectura), `POST /`, `PUT /:id`, `DELETE /:id` (admin).

- [ ] **Step 1:** casos: `calcularItem({precio_unitario:1000, sesiones:3, descuento_pct:20}).subtotal === 2400`; `calcularItem({precio_unitario:333.33, sesiones:3, descuento_pct:15}).subtotal === 849.99`; crear promo 20% del 2026-11-03 al 2026-11-16 para tratamiento T → `promosVigentes([T],'2026-11-10')` la incluye, `'2026-11-17'` no; promo `solo_completo` → `promoAplicable(id,T,'por_sesion',…) === null`, `'completo'` → promo; tratamiento no incluido → null; `desactivar` → ya no vigente; crear con 0 tratamientos lanza status 400. Limpia lo creado.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(promociones): alta y vigencia de promociones`.

### Task 3: Presupuestos (backend)

**Files:** Create `backend/src/services/presupuestos.js`, `backend/src/routes/presupuestos.js` (registrar `/api/presupuestos` con `authMiddleware, misPacientes`); Modify `backend/src/routes/planTratamientos.js`; Test `test_presupuestos.js`

**Interfaces:**
- Consumes: `calcularItem`, `promoAplicable` (Task 2).
- Produces: `async crearPresupuesto({ paciente_id, items: [{ plan_id, modalidad, promocion_id? }], firma, ip, user_agent }, userId) -> { id, total, items: [{ id, plan_tratamiento_id, tratamiento_nombre, modalidad, sesiones, precio_unitario, descuento_pct, promocion_nombre, subtotal }] }`. En una transacción: valida ≥1 item, firma dataURL imagen (mismo `esDataUrlImagen` que consentimientos — moverlo a `utils/` si es privado), cada plan es del paciente y está `sugerido` (`FOR UPDATE`), tratamiento con precio; aplica promo solo si `promoAplicable(...)` (si se pidió una no aplicable → 400 `'La promoción <nombre> no aplica'`); `sesiones = plan.sesiones_estimadas`; inserta presupuesto (firma cifrada) + items; planes → `aceptado` con `presupuesto_item_id`. Errores con `status=400`.
- Produces: `async getPresupuesto(id) -> presupuesto + items + paciente_nombre + firma (descifrada)`; `async listarPorPaciente(pacienteId)` (sin firma).
- Produces: `async crearPlanDesdeCita(citaId, userId) -> plan` — para "pase directo": si la cita ya tiene plan → lo regresa; si no, crea plan `sugerido` (tratamiento de la cita, `sesiones_estimadas=1`, paciente de la cita) y liga `citas.plan_tratamiento_id`. 400 si la cita no tiene paciente o tratamiento.
- Rutas: `POST /api/presupuestos`, `GET /api/presupuestos/:id`, `GET /api/presupuestos/paciente/:pacienteId`; `POST /api/plan-tratamientos/desde-cita/:citaId` (roles presupuesto).
- `listarPorPaciente` de planes (Fase 1) agrega: `presupuesto_id`, `modalidad`, `subtotal`, `descuento_pct`, `consentimiento_firmado_id`, `requiere_ci` (existe plantilla activa del tratamiento).

- [ ] **Step 1:** casos: 2 planes sugeridos (T1 precio 1000 ×3 sesiones con promo 20% `solo_completo` en `completo`; T2 precio 500 ×1 `por_sesion` sin promo) → total 2900, planes `aceptado` con item; un 3er plan sugerido no incluido sigue `sugerido`; pedir promo `solo_completo` en `por_sesion` → status 400 y nada guardado (contar presupuestos antes/después); plan de otro paciente → 400; plan ya aceptado → 400; sin firma → 400; tratamiento con `precio NULL` → 400; `getPresupuesto` devuelve firma original; `crearPlanDesdeCita` crea y liga, segunda llamada regresa el mismo plan. Limpia.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(presupuestos): presupuesto firmado con precios y promos calculados en servidor`.

### Task 4: CI por tratamiento + bloqueo en flujo (backend)

**Files:** Create `backend/src/services/requisitosProcedimiento.js`; Modify `backend/src/controllers/consentimientosController.js` (firmar), `backend/src/models/consentimiento.js` (createFirmado acepta `plan_tratamiento_id`), `backend/src/controllers/flujoController.js`, `backend/src/routes/flujo.js` (o donde vivan las rutas de flujo); Test `test_presupuestos.js`

**Interfaces — Produces:**
- `firmar` acepta `plan_tratamiento_id`: si viene, valida que el plan sea del `paciente_id` y que la plantilla firmada sea la del tratamiento del plan (400 si no); tras insertar, `UPDATE plan_tratamientos SET consentimiento_firmado_id`.
- `async requisitosProcedimiento(citaId) -> { exento: boolean, faltan: string[], paciente_id, plan_id }`: exento por nombre (Global Constraints); sin tratamiento → `['tratamiento']`; si la cita no tiene plan y el paciente tiene exactamente 1 plan `aceptado` de ese tratamiento → lo liga (`UPDATE citas`); plan ligado con estatus `aceptado|completado` cubre presupuesto, si no `'presupuesto'`; si existe plantilla activa del tratamiento y el plan no tiene `consentimiento_firmado_id` → `'consentimiento'`.
- `flujoController.avanzar`: si `flujo.estatus === 'en_consultorio'` y `faltan.length` → 409 `{ error: 'Falta: presupuesto firmado, consentimiento…', faltan, paciente_id, cita_id }` (texto humano por elemento: tratamiento→'tratamiento en la cita', presupuesto→'presupuesto firmado', consentimiento→'consentimiento informado').
- `GET /api/flujo/:cita_id/requisitos` → `requisitosProcedimiento`.

- [ ] **Step 1:** casos: cita de valoración → `exento:true, faltan:[]`; cita con tratamiento sin plan → `['presupuesto', ...]`; con plan aceptado sin CI y plantilla existente → `['consentimiento']`; tras `createFirmado` + `UPDATE` vía la lógica de firmar (llamar función exportada `ligarConsentimientoAPlan(firmadoId, planId)`) → `[]`; cita sin plan + 1 plan aceptado del tratamiento → se liga sola; con 2 → `faltan` incluye `'presupuesto'` y no liga; tratamiento sin plantilla → solo exige presupuesto. Limpia.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS; correr también `test_plan_tratamientos.js` → OK.
- [ ] **Step 5:** commit `feat(flujo): bloquea iniciar procedimiento sin presupuesto y consentimiento`.

### Task 5: Promociones (frontend admin)

**Files:** Create `frontend/src/api/promociones.js`, `frontend/src/components/PromocionesSection.jsx`; Modify `frontend/src/pages/TratamientosPage.jsx` (montar sección solo si `rol === 'admin'`, junto a "Consentimientos Generales")

- UI: lista (nombre, %, vigencia, "solo tratamiento completo", tratamientos, estado Vigente/Programada/Vencida/Inactiva) + botón "+ Nueva promoción" y "Editar"/"Desactivar"; form: nombre, % (number 1–100), fecha inicio/fin (`type=date`), checkbox "Solo pagando tratamiento completo", tratamientos (buscador de texto + checkboxes del catálogo activo).
- [ ] **Step 1:** implementar. **Step 2:** `npx vite build` OK. **Step 3:** commit `feat(promociones): administración de promociones`.

### Task 6: Presupuesto desde Sugeridos + CI + A realizar (frontend)

**Files:** Create `frontend/src/utils/presupuesto.js` + `presupuesto.test.js`, `frontend/src/api/presupuestos.js`, `frontend/src/components/PresupuestoModal.jsx`, `frontend/src/components/PresupuestoPrint.jsx`; Modify `frontend/src/components/ProcedimientosTab.jsx`, `frontend/src/components/ConsentimientoFirmaModal.jsx` (prop `plan` → manda `plan_tratamiento_id`), `frontend/src/api/planTratamientos.js` (`crearPlanDesdeCita`)

**Interfaces:**
- `calcularItem` frontend idéntico al backend (copia con su test: mismos 2 casos de Task 2) + `totalPresupuesto(items) -> number`.
- `PresupuestoModal({ paciente, planes /* sugeridos */, onClose, onFirmado(presupuesto) })`: paso 1 — fila por plan con checkbox, modalidad (select), promo (select de `GET /promociones/vigentes` filtradas por tratamiento y modalidad; si hay 1 aplicable se preselecciona), precio unitario, descuento, subtotal; total. Paso 2 — resumen + leyenda "Acepto el costo del tratamiento descrito…" + `SignaturePad` + "Firmar y aceptar". Envía solo `{ plan_id, modalidad, promocion_id }`; muestra lo que regresa el servidor.
- `PresupuestoPrint({ presupuestoId })`: vista imprimible (logo Gioval, paciente, fecha, tabla items, total, imagen de firma, fecha/hora de firma) con botón 🖨 que usa `window.print()`; reusa patrón de impresión de RecetasTab.
- ProcedimientosTab: Sugeridos → botón "Armar presupuesto" (roles admin, asistente_general, asistente_medico). Tras firmar: por cada plan aceptado con `requiere_ci`, abrir `ConsentimientoFirmaModal` (plantilla `getConsentimiento(tratamiento_id)`, `plan`) uno tras otro. A realizar → cada tarjeta muestra modalidad + subtotal, "CI ✓ firmado" o botón "Firmar consentimiento" (si `requiere_ci`), "Sin plantilla de CI" si no, y "Ver presupuesto".
- [ ] **Step 1:** test `presupuesto.test.js` → FAIL. **Step 2:** implementar util → PASS.
- [ ] **Step 3:** implementar componentes. **Step 4:** build OK.
- [ ] **Step 5:** commit `feat(presupuestos): armar, firmar e imprimir presupuesto; CI por tratamiento`.

### Task 7: Tarjeta del flujo (frontend)

**Files:** Modify `frontend/src/components/flujo/TarjetaPaciente.jsx`, `frontend/src/api/flujo.js`

- Si `avanzar` regresa 409 con `faltan`: mostrar el error y botones: si `faltan` incluye `presupuesto` → "📝 Armar presupuesto" (llama `crearPlanDesdeCita(cita_id)` y navega a `/pacientes/:id` con `state { tab: 'procedimientos', sub: 'sugeridos' }`); si incluye `consentimiento` → "✍️ Firmar consentimiento" (navega con `sub: 'realizar'`). ProcedimientosTab lee `sub` inicial de `location.state`.
- [ ] **Step 1:** implementar. **Step 2:** build OK. **Step 3:** commit `feat(flujo): accesos directos para resolver presupuesto y consentimiento`.

### Task 8: Cierre

- [ ] Correr `test_presupuestos.js`, `test_plan_tratamientos.js`, `test_consentimientos_generales.js`, `node frontend/src/utils/*.test.js`, build → todo OK.
- [ ] Click-through local con Playwright: alta promo (20% botox completo) → valoración con botox ×3 + otro → Armar presupuesto (promo aplicada, total correcto) → firmar → CI → A realizar con CI ✓; flujo: cita sin presupuesto bloquea con botones; con todo pasa a procedimiento; cita de valoración no bloquea; imprimir presupuesto.
- [ ] Antes de deploy: revisar en prod qué tratamientos activos no tienen plantilla de CI (solo lectura, pedir permiso a la usuaria si el clasificador lo bloquea).
