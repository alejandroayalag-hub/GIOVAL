# Plan de tratamiento — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La valoración genera diagnóstico (CIE-10 o libre) en Diagnósticos y tratamientos sugeridos del catálogo; Procedimientos se divide en Sugeridos / A realizar / Historial; las citas se ligan al plan.

**Architecture:** Migración 050 crea `plan_tratamientos` y columnas de liga. Un servicio backend (`services/planTratamiento.js`) sincroniza la valoración → diagnóstico + planes sugeridos dentro del create/update de `documentos_clinicos`, y cierra planes al completar sesiones. Frontend: bloque reutilizable `PlanTratamientoBlock` en el DocModal de valoraciones, nueva `ProcedimientosTab` con 3 sub-pestañas, selector de plan en `CitaModal`.

**Tech Stack:** Node/Express + `pg` (pool), PostgreSQL 16, React + Vite + Tailwind. Tests: scripts `node backend/src/scripts/test_*.js` con `assert` contra la BD local (patrón de `test_consentimientos_generales.js`).

**Spec:** `docs/superpowers/specs/2026-10-29-plan-tratamiento-presupuesto-design.md` (solo Fase 1)

## Global Constraints

- Migración nueva: `backend/src/db/migrations/050_plan_tratamientos.sql`; idempotente (`IF NOT EXISTS`), corre con `node backend/src/db/migrate.js`.
- Estatus de plan: exactamente `sugerido | aceptado | completado | cancelado`.
- Tipos de valoración (los 7 del grupo Valoraciones): `val_01, val_01b, val_02, val_03, val_04, val_05, hist_lax`.
- Valoraciones viejas no se reescriben: sus campos de texto (`diagnostico`, `tratamientos_propuestos`, `tratamiento_propuesto`, `sesiones`) se muestran solo lectura como "Registro anterior".
- Lo no aceptado se queda en `sugerido`; re-guardar una valoración solo toca sus planes en `sugerido`, nunca `aceptado/completado/cancelado`.
- Roles: mismos que hoy (`documentos-clinicos`: admin + asistente_medico escriben; borrar solo admin). Lectura de planes: admin, asistente_medico, cosmetista, asistente_general.
- Paleta/estilos: variables CSS existentes (`--color-accent`, `--color-sage`, `--color-primary`, `--color-dark`, `--color-cream`).
- Fase 1 no crea presupuestos: "A realizar" muestra planes `aceptado` (vacío hasta Fase 2). No se agrega ningún botón para aceptar a mano.

## Review Focus

1. Valoración guardada dos veces (editar y volver a guardar) → no duplica diagnóstico ni planes sugeridos. Test en Task 2.
2. Quitar un tratamiento de la valoración ya `aceptado` → no se borra ni cambia. Test en Task 2.
3. Valoración sin tratamientos ni diagnóstico (solo campos clínicos) → guarda igual que hoy, no crea nada. Test en Task 2.
4. Cita marcada `realizada` por el flujo (cierre → en_caja) o por edición de cita → cuenta la sesión y cierra el plan al llegar a `sesiones_estimadas`. Test en Task 3.
5. Paciente con 2 planes aceptados del mismo tratamiento → CitaModal pide elegir, no liga al azar. Verificación manual en Task 6.

---

### Task 1: Migración 050

**Files:**
- Create: `backend/src/db/migrations/050_plan_tratamientos.sql`
- Test: `backend/src/scripts/test_plan_tratamientos.js` (se crea aquí, Tasks 2–3 le agregan casos)

**Interfaces:**
- Produces: tabla `plan_tratamientos(id SERIAL PK, paciente_id INT NOT NULL FK pacientes ON DELETE CASCADE, tratamiento_id INT NOT NULL FK tratamientos, valoracion_id INT NULL FK documentos_clinicos ON DELETE SET NULL, diagnostico_id INT NULL FK paciente_diagnosticos ON DELETE SET NULL, sesiones_estimadas INT NOT NULL DEFAULT 1 CHECK (>=1), frecuencia TEXT, notas TEXT, estatus VARCHAR(12) NOT NULL DEFAULT 'sugerido' CHECK IN (...), motivo_cancelacion TEXT, created_by INT FK usuarios, created_at, updated_at)`; índices `(paciente_id, estatus)` y `(valoracion_id)`.
- Produces: `citas.plan_tratamiento_id INT NULL FK plan_tratamientos ON DELETE SET NULL`; `documentos_clinicos.cita_id INT NULL FK citas ON DELETE SET NULL`.
- (Columnas de Fases 2–3 — `presupuesto_item_id`, `consentimiento_firmado_id`, `movimientos.presupuesto_item_id`, `consentimientos_firmados.plan_tratamiento_id` — NO van aquí; van en la migración de su fase.)

- [ ] **Step 1: Escribir test** `test_plan_tratamientos.js` con `assert`: consulta `information_schema.columns` y verifica que existen `plan_tratamientos.estatus`, `citas.plan_tratamiento_id`, `documentos_clinicos.cita_id`; insertar plan con `estatus='otro'` lanza error (CHECK).
- [ ] **Step 2: Correr** `cd backend && node src/scripts/test_plan_tratamientos.js` → FAIL (tabla no existe).
- [ ] **Step 3: Escribir la migración** y correr `node src/db/migrate.js`.
- [ ] **Step 4: Correr test** → PASS.
- [ ] **Step 5: Commit** `feat(db): migración 050 plan_tratamientos`

### Task 2: Servicio de sincronización valoración → diagnóstico + sugeridos

**Files:**
- Create: `backend/src/services/planTratamiento.js`
- Modify: `backend/src/controllers/documentosClinicosController.js` (create/update)
- Test: `backend/src/scripts/test_plan_tratamientos.js`

**Interfaces:**
- Consumes: Task 1 tablas.
- Produces: `VALORACION_TIPOS` (array de los 7 tipos) y `async syncDesdeValoracion(doc, userId) -> doc` en `services/planTratamiento.js`.
- Forma de `datos.plan` (contrato con el frontend, Task 4):
  `{ diagnostico_cie10: string|null, diagnostico_texto: string|null, diagnostico_id: number|null, tratamientos: [{ plan_id?: number, tratamiento_id: number, sesiones: number, frecuencia: string, notas: string }] }`

Comportamiento de `syncDesdeValoracion` (todo en una transacción con `pool.connect()`):
- Si `doc.tipo` no está en `VALORACION_TIPOS` o no hay `datos.plan` → regresa `doc` sin tocar nada.
- Diagnóstico: si hay `diagnostico_cie10` o `diagnostico_texto`: si `diagnostico_id` existe → `UPDATE paciente_diagnosticos SET cie10_codigo, notas`; si no → `INSERT` (fecha = `doc.fecha`) y guarda el id en `datos.plan.diagnostico_id`. Si ambos vacíos y hay `diagnostico_id` → no borra el diagnóstico (solo deja de ligarlo).
- Tratamientos: para filas con `plan_id` cuyo plan siga `sugerido` → UPDATE (tratamiento, sesiones, frecuencia, notas, diagnostico_id). Filas sin `plan_id` → INSERT `sugerido` con `valoracion_id = doc.id` y escribe el nuevo `plan_id` en la fila. Planes `sugerido` de esa valoración que ya no vienen en la lista → DELETE. Planes no-`sugerido` nunca se tocan.
- Guarda `datos` actualizado (`UPDATE documentos_clinicos SET datos`) y regresa el doc.
- Controller: tras `DocClinico.create/update`, `doc = await syncDesdeValoracion(doc, req.user.id)` y responde ese doc. En create, también acepta y guarda `cita_id` del body (para Task 5).

- [ ] **Step 1: Agregar casos al test**: (a) crear doc `val_01` con plan {cie10 'L70.0', texto 'acné', 2 tratamientos} vía `DocClinico.create` + `syncDesdeValoracion` → 1 fila en `paciente_diagnosticos` y 2 planes `sugerido`, y `datos.plan.tratamientos[*].plan_id` llenos; (b) re-sync con el doc devuelto → siguen 1 dx y 2 planes; (c) poner un plan en `aceptado` por SQL, quitar ambos tratamientos y re-sync → queda solo el aceptado, intacto; (d) doc `val_02` sin `datos.plan` → 0 planes, 0 dx; (e) doc `proc_01` con `datos.plan` → ignorado. Limpia todo lo creado al final.
- [ ] **Step 2: Correr test** → FAIL (`syncDesdeValoracion` no existe).
- [ ] **Step 3: Implementar servicio y conectar controller.**
- [ ] **Step 4: Correr test** → PASS.
- [ ] **Step 5: Commit** `feat(valoracion): sincroniza diagnóstico y tratamientos sugeridos`

### Task 3: API de planes + avance de sesiones

**Files:**
- Create: `backend/src/routes/planTratamientos.js`; registrar en `backend/src/index.js` como `/api/plan-tratamientos` con `authMiddleware, misPacientes` (igual que `documentos-clinicos`)
- Modify: `backend/src/services/planTratamiento.js`, `backend/src/models/cita.js` (create/update aceptan `plan_tratamiento_id`), `backend/src/controllers/citasController.js` (update), `backend/src/controllers/flujoController.js` (cierre → realizada)
- Test: `backend/src/scripts/test_plan_tratamientos.js`

**Interfaces:**
- Produces: `async listarPorPaciente(pacienteId) -> Plan[]` donde `Plan = { id, tratamiento_id, tratamiento_nombre, sesiones_estimadas, sesiones_realizadas, frecuencia, notas, estatus, valoracion_id, valoracion_tipo, valoracion_fecha, diagnostico_id, diagnostico_label, proxima_cita: {id, fecha_hora}|null, created_at }` (`sesiones_realizadas` = citas `realizada` con ese plan; `diagnostico_label` = cie10 + descripción o notas).
- Produces: `async actualizarAvance(planId) -> void`: si plan `aceptado` y `sesiones_realizadas >= sesiones_estimadas` → `completado`.
- Produces: `async historial(pacienteId) -> { sesiones: [{cita_id, fecha_hora, tratamiento_nombre, empleada_nombre, plan_id, sesion_n, sesiones_estimadas, documentos: [{id, tipo, fecha}]}], sin_sesion: [{id, tipo, fecha}] }` — sesiones = citas `realizada` del paciente (con o sin plan, excluyendo tratamientos `ILIKE 'valoraci%'`), `documentos` = `documentos_clinicos` con ese `cita_id` y tipo `proc_*`/`bit_*`; `sin_sesion` = docs `proc_*`/`bit_*` sin `cita_id`.
- Rutas: `GET /api/plan-tratamientos/paciente/:pacienteId` → `listarPorPaciente`; `GET /api/plan-tratamientos/paciente/:pacienteId/historial` → `historial`. Roles lectura: admin, asistente_medico, cosmetista, asistente_general.
- Llamar `actualizarAvance(cita.plan_tratamiento_id)` cuando una cita pasa a `realizada` en `citasController.update` y en `flujoController.avanzar` (rama cierre).

- [ ] **Step 1: Agregar casos al test**: plan `aceptado` con `sesiones_estimadas=2`; 1 cita `realizada` ligada → `listarPorPaciente` da `sesiones_realizadas=1`, `actualizarAvance` lo deja `aceptado`; 2a cita realizada + `actualizarAvance` → `completado`; `historial` incluye ambas sesiones con `sesion_n` 1 y 2 y un doc `proc_01` ligado por `cita_id` aparece en `documentos` de su sesión, uno sin `cita_id` en `sin_sesion`.
- [ ] **Step 2: Correr test** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Correr test** → PASS; `curl` con token local a ambas rutas → 200.
- [ ] **Step 5: Commit** `feat(planes): API de planes, historial y avance de sesiones`

### Task 4: Bloque "Plan de tratamiento" en valoraciones (frontend)

**Files:**
- Create: `frontend/src/components/Cie10Picker.jsx` (extraído del buscador de `DiagnosticosTab` en `ExpedienteTabs.jsx:18-75`; `DiagnosticosTab` pasa a usarlo)
- Create: `frontend/src/components/PlanTratamientoBlock.jsx`
- Modify: `frontend/src/components/DocumentosClinicosTab.jsx` (DocModal y los 7 forms de valoración)

**Interfaces:**
- Produces: `<Cie10Picker value={{codigo, descripcion}|null} onChange={(sel|null) => void} />`.
- Produces: `<PlanTratamientoBlock plan={datos.plan} onChange={plan => set('plan', plan)} legacy={{diagnostico, tratamientos_propuestos, tratamiento_propuesto, sesiones}} />` — usa contrato `datos.plan` de Task 2. Tratamientos desde la API existente de tratamientos (activos); filas con `plan_id` cuyo plan ya no es `sugerido` se muestran bloqueadas con su estatus (necesita `planes` de `GET /plan-tratamientos/paciente/:id`).
- UI: Diagnóstico = textarea libre (con `BotonDictado`) + `Cie10Picker` opcional. Tratamientos = filas {select tratamiento, sesiones (number ≥1), frecuencia (texto, placeholder "cada 15 días"), notas, ✕} + "+ Agregar tratamiento". Si `legacy` tiene texto → caja gris "Registro anterior" solo lectura.
- En los 7 forms: quitar los campos `diagnostico`, `tratamientos_propuestos`, `tratamiento_propuesto`, `sesiones` del bloque "Plan de tratamiento" (los demás campos — pronóstico, metas — se quedan). DocModal renderiza `PlanTratamientoBlock` al final cuando `tipoInfo.group === 'Valoraciones'`.

- [ ] **Step 1: Implementar componentes y cambios.**
- [ ] **Step 2: Build** `cd frontend && npx vite build` → sin errores.
- [ ] **Step 3: Verificación manual local** (frontend + backend dev): crear VAL-01 con dx CIE-10 + 2 tratamientos → aparece en pestaña Diagnósticos y en Procedimientos › Sugeridos (tras Task 5); reabrir y guardar → sin duplicados; abrir una valoración vieja → muestra "Registro anterior".
- [ ] **Step 4: Commit** `feat(valoracion): plan de tratamiento estructurado con CIE-10 y catálogo`

### Task 5: Procedimientos con 3 sub-pestañas

**Files:**
- Create: `frontend/src/api/planTratamientos.js` (`getPlanes(pacienteId)`, `getHistorialProcedimientos(pacienteId)`)
- Create: `frontend/src/components/ProcedimientosTab.jsx`
- Modify: `frontend/src/pages/PacienteDetallePage.jsx:658-660` (usa `ProcedimientosTab`), `frontend/src/components/DocumentosClinicosTab.jsx` (exportar `DocModal` y aceptar prop `citaId` que viaja en `createDoc`)

**Interfaces:**
- Consumes: rutas de Task 3; `DocModal` con `citaId`.
- UI:
  - **Sugeridos**: tarjetas por plan `sugerido` (tratamiento, sesiones × frecuencia, dx, de qué valoración/fecha). Sin acciones en Fase 1 (presupuesto llega en Fase 2); texto gris "Pendiente de presupuesto".
  - **A realizar**: planes `aceptado` con barra "n de N sesiones" y próxima cita; vacío → "Sin tratamientos aceptados".
  - **Historial**: sesiones de `historial()` más recientes primero ("Sesión 2 de 3 · Botox · 12 nov · Dra."), con sus formatos (abrir) y botón "+ Formato" (menú PROC-01…03, BIT-01…05) que abre `DocModal` con `citaId`; al final grupo "Formatos sin sesión ligada". Planes `completado`/`cancelado` listados abajo como resumen.
- La sub-pestaña por defecto es Sugeridos si hay sugeridos, si no A realizar.

- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Build** → sin errores.
- [ ] **Step 3: Verificación manual local**: los sugeridos de Task 4 aparecen; poner uno `aceptado` por SQL → pasa a A realizar; crear cita ligada, marcarla realizada → aparece en Historial como "Sesión 1 de N"; agregar PROC-01 desde esa sesión → queda colgado de ella.
- [ ] **Step 4: Commit** `feat(procedimientos): sub-pestañas sugeridos, a realizar e historial`

### Task 6: Liga cita ↔ plan en CitaModal

**Files:**
- Modify: `frontend/src/components/CitaModal.jsx`, `backend/src/controllers/citasController.js` (validar que el plan pertenezca al paciente)

**Interfaces:**
- Consumes: `getPlanes(pacienteId)` (Task 5), `citas.plan_tratamiento_id` (Task 3).
- Comportamiento: con paciente y tratamiento elegidos, filtra planes `aceptado` de ese tratamiento: 0 → nada; 1 → liga solo y muestra "Sesión n+1 de N · plan de <fecha>"; >1 → select obligatorio. Cambiar tratamiento limpia la liga. Envía `plan_tratamiento_id` en create/update. Backend: si `plan_tratamiento_id` viene y el plan no es del `paciente_id` de la cita → 400 `'El plan no corresponde al paciente'`.

- [ ] **Step 1: Agregar caso al test backend**: update de cita con plan de otro paciente → el controller responde 400 (probar vía la función de validación exportada `validarPlanDeCita(planId, pacienteId) -> boolean` en `services/planTratamiento.js`).
- [ ] **Step 2: Correr test** → FAIL. **Step 3: Implementar.** **Step 4: Test** → PASS; build OK.
- [ ] **Step 5: Verificación manual**: Review Focus #5 (dos planes del mismo tratamiento → pide elegir).
- [ ] **Step 6: Commit** `feat(citas): liga cita con plan de tratamiento aceptado`

### Task 7: Cierre de fase

- [ ] Correr `node backend/src/scripts/test_plan_tratamientos.js` completo → PASS; `npx vite build` → OK.
- [ ] Click-through local completo (Tasks 4–6).
- [ ] No hay deploy sin aprobación de la usuaria; deploy = `./deploy.sh` desde árbol limpio + `node src/db/migrate.js` en servidor.
