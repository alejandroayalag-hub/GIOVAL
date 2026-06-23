# Consentimientos Generales (CI-00, CI-01) — Design

## Contexto

El módulo de Consentimientos Informados (migraciones 013 y 018) solo modela consentimientos **por tratamiento**: la tabla `consentimientos` tiene `tratamiento_id UNIQUE` y todo el flujo de firma (frontend y backend) parte de una cita con `tratamiento_id`.

Comparando el catálogo fuente (`CONSENTIMIENTOS INFORMADOS GIOVAL.docx`, versión final CI-00 a CI-23) contra lo sembrado en producción, encontramos que CI-00 (Aviso de Privacidad Integral) y CI-01 (Carta Compromiso del Paciente) nunca se implementaron — y no es un olvido de seed: son documentos **por paciente**, no por tratamiento, y el modelo actual no tiene dónde guardarlos.

CI-12 (Autorización de Fotografía Clínica) se descarta como documento aparte: CI-01 ya incluye el checkbox de autorización de fotos, así que se fusiona ahí.

Hallazgos adicionales fuera de alcance de este spec (documentados para referencia futura):
- CI-17 (Liposinic / Aparatología Corporal Reductora) nunca se sembró como plantilla de tratamiento — solo se menciona como alternativa dentro de otros consentimientos.
- Ningún consentimiento (ni los de tratamiento existentes) captura firma de médico, testigos, huella digital o representante legal, aunque el docx fuente incluye esos campos en todos los documentos. El sistema ya simplificó esto a "solo firma del paciente en canvas" para los 20 tratamientos en producción; este spec mantiene la misma simplificación para consistencia.

## Objetivo

Que CI-00 y CI-01 se puedan firmar digitalmente una vez por paciente, reusando al máximo el modelo/componentes existentes de consentimientos por tratamiento.

## Cuándo se firman

- **Paciente nuevo:** al guardar el alta en `PacienteFormModal` (desde `PacientesPage`), se navega al expediente del paciente con la pestaña Consentimientos abierta, donde aparece el banner de pendientes.
- **Paciente existente sin firmar:** mismo banner, visible en cualquier momento que se abra su expediente.

No hay re-firma forzada si el texto cambia (fuera de alcance — el aviso de privacidad ya incluye su propia cláusula de notificación de cambios, pero el reflejo de eso en el sistema no se implementa aquí).

## Modelo de datos

Migración `029_consentimientos_generales.sql`:

```sql
ALTER TABLE consentimientos ADD COLUMN codigo VARCHAR(10) UNIQUE;

INSERT INTO consentimientos (codigo, titulo, texto_consentimiento, activo)
VALUES
  ('CI-00', 'Aviso de Privacidad Integral', '<texto íntegro de CI-00 del docx>', true),
  ('CI-01', 'Carta Compromiso del Paciente', '<texto íntegro de CI-01 del docx, incluye checkbox de fotos>', true)
ON CONFLICT (codigo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  texto_consentimiento = EXCLUDED.texto_consentimiento;
```

No se modifica `tratamiento_id` (sigue `UNIQUE`; Postgres permite múltiples `NULL` en una columna `UNIQUE`, así que las filas de CI-00/CI-01 con `tratamiento_id = NULL` no chocan con las 124 existentes). `cuidados_pre`/`cuidados_post` quedan `NULL` para estas dos filas — no aplica el concepto de "antes/después del procedimiento".

`consentimientos_firmados.cita_id` ya es nullable — una firma general no trae cita.

## Backend

**`models/consentimiento.js`** — agregar:
```js
findByCodigo(codigo)                    // SELECT ... WHERE codigo = $1
upsertGeneral(codigo, data, userId)     // INSERT ... ON CONFLICT (codigo) DO UPDATE
```
`findFirmadosByPaciente` se ajusta para incluir `c.codigo` en el SELECT (una línea), así el frontend puede distinguir firmas generales de firmas por tratamiento.

**`controllers/consentimientosController.js`** — agregar `getByCodigo` / `saveGeneral` (mismo guard `req.user.rol !== 'admin'` para editar). `firmar` no cambia.

**`routes/consentimientos.js`** — agregar:
```js
router.get('/general/:codigo', ctrl.getByCodigo);
router.put('/general/:codigo', ctrl.saveGeneral);
```

## Frontend

**`api/consentimientos.js`** — agregar `getConsentimientoGeneral(codigo)` / `saveConsentimientoGeneral(codigo, data)`.

**`ConsentimientoFirmaModal`** — sin cambios. Ya soporta `cita={null}` (oculta la línea de "Procedimiento").

**`PacienteDetallePage.jsx`** — pestaña Consentimientos:
- Banner nuevo antes de la lista de pendientes por cita:
  ```jsx
  const generalesFaltantes = ['CI-00', 'CI-01'].filter(
    cod => !consentsFirmados.some(cf => cf.codigo === cod)
  );
  ```
  Si `generalesFaltantes.length > 0`, mostrar callout con botón "Firmar ahora" que abre `ConsentimientoFirmaModal` para `generalesFaltantes[0]` (obtenido vía `getConsentimientoGeneral`). Al firmar, recarga y el banner muestra el siguiente pendiente hasta vaciarse.
- `useState('historia')` pasa a `useState(location.state?.tab || 'historia')` para poder aterrizar directo en la pestaña Consentimientos.

**`PacientesPage.jsx:88`** — `onSaved` cambia de `() => { setModal(false); cargar(); }` a:
```js
onSaved={(saved) => { setModal(false); navigate(`/pacientes/${saved.id}`, { state: { tab: 'consentimientos' } }); }}
```

**`ConsentimientoEditModal.jsx`** — generalizar para aceptar `general={{ codigo, titulo }}` además de `tratamiento={{ id }}`; según cuál prop llegue, usa el par de funciones API correspondiente (tratamiento vs. general).

**`TratamientosPage.jsx`** — bloque admin-only arriba de la tabla: "Consentimientos Generales" con 2 botones "Editar" (CI-00, CI-01) que abren `ConsentimientoEditModal` con `general={{codigo: 'CI-00', titulo: 'Aviso de Privacidad Integral'}}` (y análogo para CI-01).

## Contenido a sembrar

Texto íntegro de CI-00 y CI-01 tomado de `CONSENTIMIENTOS INFORMADOS GIOVAL.docx` (versión final, no la del borrador `Consentimientos informados.docx` que solo llega a CI-11 y tiene texto menos desarrollado). CI-01 incluye el checkbox de autorización de fotos ya integrado; no se crea documento CI-12 aparte.

## Verificación

- Script `backend/scripts/test_consentimientos_generales.js` (assert-based, sin framework): corre contra la BD de dev, verifica que `findByCodigo('CI-00')` y `('CI-01')` devuelven texto no vacío, inserta un firmado con `cita_id=null` y confirma que `findFirmadosByPaciente` lo regresa con su `codigo`.
- Manual: alta de paciente nuevo → aterriza en expediente con banner CI-00 pendiente → firma ambos en secuencia → banner desaparece → quedan listados en la pestaña Consentimientos. Repetir abriendo un paciente existente (creado antes de este cambio) para confirmar que también ve el banner.

## Fuera de alcance (para iteración futura)

- CI-17 (Liposinic) como plantilla de tratamiento faltante.
- Captura digital de firma de médico, testigos, huella y representante legal (aplica a los 20 consentimientos de tratamiento también, no solo a los generales).
