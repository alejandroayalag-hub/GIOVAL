# Plan de tratamiento, presupuesto firmado y promociones — Diseño

Fecha: 2026-10-29 · Proyecto: Elys (Gioval) · Estado: borrador para aprobación

## Por qué

Hoy el expediente del paciente no se hila. En las valoraciones (VAL-01…05, HIST-LAX), "Diagnóstico", "Tratamientos propuestos" y "Sesiones estimadas / frecuencia" son texto libre: no alimentan la pestaña Diagnósticos ni crean nada en Procedimientos. Recepción da precios de memoria, las promociones no existen en el sistema y nada impide aplicar un procedimiento sin que la paciente haya aceptado el costo ni firmado el consentimiento.

Objetivo: que lo que Gio propone en la valoración fluya solo hasta el procedimiento realizado, pasando por un presupuesto con firma de aceptación de costo y el consentimiento informado del tratamiento.

## Flujo real de la clínica (según la usuaria)

1. Recepción → historia clínica → valoración (Gio) → diagnóstico + tratamientos propuestos.
2. La **recepcionista** (a veces Gio directo) da el precio ahí mismo y agenda; si hay lugar libre, se procede el mismo día.
3. Con promoción se paga el **tratamiento completo**; sin promoción, **por sesión**.
4. El tratamiento completo se puede **abonar** (típico: 50% al inicio, 50% a la mitad del tratamiento). Con saldo pendiente **sí** puede tomar sesiones; el saldo solo debe verse.

## Metas

1. **Valoración estructurada**: tratamientos propuestos elegidos del catálogo `tratamientos`, cada uno con sesiones estimadas y frecuencia. Diagnóstico elegido de CIE-10 **o** texto libre; en ambos casos crea registro en `paciente_diagnosticos` (pestaña Diagnósticos).
2. **Procedimientos con 3 sub-pestañas**:
   - **Sugeridos**: propuestos por valoración, aún no aceptados. Lo que la paciente no acepta **se queda aquí** para ofrecerse después.
   - **A realizar**: aceptados (presupuesto firmado), con avance de sesiones (p. ej. 1 de 3) y saldo pendiente.
   - **Historial**: sesiones realizadas, cada una con sus formatos clínicos (PROC-01…03, BIT-01…05) llenados en esa sesión.
   El paso entre pestañas es automático.
3. **Presupuesto con firma de aceptación de costo**: se arma desde Sugeridos, eligiendo qué tratamientos acepta y modalidad (por sesión / tratamiento completo), aplicando promociones vigentes. La paciente firma (canvas). Al firmar, los tratamientos aceptados pasan a A realizar.
4. **Consentimiento informado por tratamiento**: tras firmar el presupuesto se pide el consentimiento del tratamiento (plantilla existente por `tratamiento_id`). Se firma **una vez por tratamiento** y cubre todas sus sesiones.
5. **Bloqueo**: el flujo del día no deja **"⚡ Iniciar procedimiento"** si el tratamiento de la cita no tiene presupuesto firmado y consentimiento firmado. Aplica también cuando Gio pasa directo a tratamiento.
6. **Promociones** dadas de alta por Gio (admin): nombre, % de descuento, uno o varios tratamientos, fecha inicio/fin, casilla "solo pagando tratamiento completo". Ejemplos reales: Buen Fin 20% botox y ácido hialurónico del 3 al 16 nov; botox 15% en tratamiento completo este mes.
7. **Abonos y saldo**: el tratamiento completo se paga en abonos desde Caja; el saldo pendiente se ve en A realizar, en la tarjeta del flujo y en Caja. Al llegar a la sesión de la mitad sin haber cubierto ≥ 50%, **aviso** (no bloqueo).

## No-metas

- No se cambia el bloqueo de consentimientos generales CI-00/01/02 (ya en prod).
- No se reescriben valoraciones viejas: conservan su texto libre y se muestran tal cual.
- No hay vigencia/expiración de presupuestos ni descuentos manuales a mano (solo promociones dadas de alta).
- No se toca la agenda en línea (gioval.mx/agendar).
- No se toca la app iOS.

## Anti-metas (fallaría aunque funcione)

- Que recepción no pueda operar un día normal: el bloqueo debe dar siempre un botón directo para resolverlo (crear presupuesto / firmar consentimiento) desde la tarjeta del flujo, como el de CI-00/01/02.
- Que una sesión de paquete pagado se cobre dos veces en Caja.
- Que se pierda la relación sesión ↔ formato clínico.

## Modelo de datos (decisión del diseño)

Migración nueva **050**.

- `promociones` (id, nombre, descuento_pct NUMERIC(5,2), fecha_inicio DATE, fecha_fin DATE, solo_completo BOOLEAN, activo BOOLEAN, created_by, created_at) + `promocion_tratamientos` (promocion_id, tratamiento_id, PK compuesta).
- `plan_tratamientos` — cada tratamiento propuesto a un paciente:
  id, paciente_id, tratamiento_id, valoracion_id (FK `documentos_clinicos`, nullable), diagnostico_id (FK `paciente_diagnosticos`, nullable), sesiones_estimadas INT, frecuencia TEXT, notas TEXT,
  estatus `sugerido | aceptado | completado | cancelado`,
  presupuesto_item_id (nullable), consentimiento_firmado_id (FK `consentimientos_firmados`, nullable), created_at.
- `presupuestos` (id, paciente_id, fecha, total, firma TEXT dataURL, firmado_at, ip, user_agent, created_by) + `presupuesto_items` (id, presupuesto_id, plan_tratamiento_id, modalidad `por_sesion | completo`, sesiones INT, precio_unitario, promocion_id nullable, descuento_pct, subtotal).
- `citas.plan_tratamiento_id` (nullable FK). Sesiones realizadas = citas `realizada` con ese plan.
- `movimientos.presupuesto_item_id` (nullable FK) para abonos. Saldo = subtotal − Σ abonos.
- `documentos_clinicos.cita_id` (nullable FK) para colgar formatos PROC/BIT de la sesión.
- `consentimientos_firmados.plan_tratamiento_id` (nullable) para el consentimiento por tratamiento.

## Comportamiento

**Valoración**: en los 6 formatos de valoración, el bloque "Plan de tratamiento" cambia a: diagnóstico (autocomplete CIE-10 reutilizando el de DiagnosticosTab + texto libre) y lista de filas {tratamiento del catálogo, sesiones, frecuencia, notas}. Campos clínicos propios del formato (pronóstico, metas, etc.) se quedan igual. Al guardar: crea/actualiza el diagnóstico y sincroniza filas `sugerido` de esa valoración (re-guardar edita las que siguen en sugerido; no toca aceptadas).

**Sugeridos → presupuesto**: botón "Armar presupuesto". Checkbox por tratamiento; modalidad; si hay promo vigente para el tratamiento (y la modalidad la permite), se aplica sola (si hay varias, se elige). Precio base = `tratamientos.precio`. Vista previa imprimible → firma canvas (reusa SignaturePad) → guarda, aceptados pasan a `aceptado` y de inmediato se ofrece firmar el consentimiento de cada uno. No aceptados se quedan en `sugerido`.

**Pase directo**: si la cita del flujo no tiene plan (tratamiento no estaba en una valoración), la tarjeta ofrece "Crear presupuesto" que crea el plan `sugerido` al vuelo con el tratamiento de la cita y abre el mismo flujo.

**A realizar**: tarjeta por tratamiento con avance (sesiones realizadas / sesiones), saldo, consentimiento ✓/pendiente, botón "Agendar sesión" (abre CitaModal con tratamiento y plan precargados). Al completar todas las sesiones → `completado` → sale de A realizar.

**Liga cita ↔ plan**: al crear una cita en CitaModal para un paciente con plan `aceptado` del mismo tratamiento, se liga sola (si hay más de uno, se elige).

**Bloqueo en flujo** (`flujoController.avanzar`, en_consultorio → en_procedimiento): exige plan `aceptado` con consentimiento firmado. 409 con `paciente_id`/`cita_id` y botón directo en `TarjetaPaciente`.

**Caja**:
- Sesión `por_sesion`: igual que hoy, se cobra la cita (precio del presupuesto con promo si aplica).
- Sesión de tratamiento `completo`: la cita se marca cobrada sin cobro nuevo ("cubierta por paquete"); se muestra el saldo del paquete y botón "Registrar abono".
- Abono: movimiento ingreso con `presupuesto_item_id`. Aviso al llegar a la sesión ⌈n/2⌉ si abonado < 50%.

**Historial**: lista de sesiones realizadas (fecha, tratamiento, n de N, especialista) con sus formatos PROC/BIT; al crear un formato desde una sesión queda ligado por `cita_id`. Formatos viejos sin cita aparecen en un grupo "Sin sesión ligada".

## Roles

- Promociones: solo `admin`.
- Presupuestos y abonos: `admin`, `asistente_general`, `asistente_medico`.
- Valoración / diagnóstico: los mismos que hoy.

## Fases sugeridas (cada una desplegable sola)

1. Migración 050 + valoración estructurada + Procedimientos en 3 sub-pestañas (Sugeridos / A realizar / Historial) + liga cita↔plan.
2. Promociones + presupuesto con firma + consentimiento por tratamiento + bloqueo en flujo.
3. Caja: abonos, saldo, sesión cubierta por paquete, aviso 50%.

## Decisiones tomadas por Claude (no confirmadas por la usuaria)

- Citas de **valoración** (`nombre ILIKE 'valoraci%'`, misma regla de agenda en línea) quedan exentas del bloqueo de presupuesto/consentimiento.
- Firma del presupuesto: solo canvas + IP/UA; **sin INE** (ya se pide en los consentimientos).
- Presupuesto imprimible (vista print como receta), sin envío por WhatsApp/email.
- Un solo % por promoción; si dos promos aplican al mismo tratamiento, recepción elige.
- Modalidad por tratamiento (no por presupuesto completo).
- **Todo** procedimiento pasa por presupuesto firmado, incluidos los de una sola sesión (botox, ácido hialurónico) — la usuaria dijo "todo procedimiento".
- Exentos de presupuesto y consentimiento, igual que valoración: "Cita de seguimiento" y "Anticipo para reservar cita". Tratamientos sin plantilla de consentimiento activa (en BD local: Test epigenético, Tricoscopia digital) exigen presupuesto pero no consentimiento; la tarjeta avisa "sin plantilla de CI". Revisar la lista en prod antes del deploy.
- Precio y promo quedan **congelados al firmar** el presupuesto (aunque la promo venza después). Por sesión: Caja precarga el precio del presupuesto.
- El plan pasa a `completado` al llegar a las sesiones pactadas; más sesiones = nuevo presupuesto.
- Abonos usan el mismo selector de empresa (Giovanna PF / Elys PM) que Caja hoy. En "ganancia por tratamiento", el ingreso de un tratamiento completo se reparte entre sus sesiones realizadas (subtotal ÷ sesiones).
- Aviso 50%: al iniciar o cobrar la sesión ⌈n/2⌉ si Σ abonos < 50% del subtotal ya con promoción.
- Firmar el consentimiento por tratamiento: mismos roles que hoy firman consentimientos.
- **Cancelación / cambios** (política de la clínica aún desconocida — preguntar a Gio): un presupuesto firmado **no se edita**. Solo `admin` puede cancelar un tratamiento aceptado, con motivo obligatorio; queda `cancelado` mostrando sesiones tomadas, abonado y saldo. El sistema **no calcula devoluciones**: si Gio decide devolver, se registra a mano como egreso en Finanzas. Cambio de sesiones o de tratamiento = cancelar + presupuesto nuevo firmado. Se ajusta cuando Gio defina su política.

## Queda a criterio del builder

Estructura de componentes, endpoints REST, nombres finales, estilos (seguir paleta y patrones existentes), cómo mostrar el aviso 50%.
