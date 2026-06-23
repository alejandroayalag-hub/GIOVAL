# Consentimientos Generales (CI-00, CI-01) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let CI-00 (Aviso de Privacidad) and CI-01 (Carta Compromiso, con checkbox de autorización de fotos) firmarse digitalmente una vez por paciente, reusando el modelo/componentes existentes de consentimientos por tratamiento.

**Architecture:** Se agrega una columna `codigo` a la tabla `consentimientos` existente (sin tocar `tratamiento_id`, que ya permite múltiples `NULL` por ser `UNIQUE` en Postgres) para sembrar 2 filas "generales". Se reutilizan modelo/controller/rutas/componentes de consentimientos por tratamiento, agregando funciones espejo que buscan por `codigo` en vez de `tratamiento_id`. Un banner compartido en `PacienteDetallePage` atiende tanto a pacientes nuevos (redirigidos ahí tras el alta) como a pacientes existentes sin firmar.

**Tech Stack:** Node.js + Express 5, PostgreSQL 16 (pg driver, sin ORM), React 19 + Vite, sin frameworks de testing (se verifica con scripts `assert` y manualmente en navegador).

## Global Constraints

- Fuente del texto legal: `CONSENTIMIENTOS INFORMADOS GIOVAL.docx` (versión final, no el borrador `Consentimientos informados.docx`).
- CI-12 (fotografía) NO se crea como documento aparte — su autorización vive dentro de CI-01 como checkbox real.
- `ConsentimientoFirmaModal` mantiene su declaración y firma genéricas para todo tipo de consentimiento; el checkbox de fotos es la única adición condicional (solo cuando `codigo === 'CI-01'`).
- No hay framework de tests instalado (ni backend ni frontend) — usar scripts `assert`-based para backend y verificación manual + `npm run build` para frontend.
- Migraciones viven en `backend/src/db/migrations/`, se aplican automáticamente al iniciar el backend (`runMigrations()` en `src/index.js`). La última migración existente es `028-create-farmacia-tables.sql`.

---

### Task 1: Migración 029 — columna `codigo`, columna `autoriza_fotos`, seed CI-00/CI-01

**Files:**
- Create: `backend/src/db/migrations/029_consentimientos_generales.sql`
- Create: `backend/src/scripts/test_consentimientos_generales.js`

**Interfaces:**
- Produces: filas `consentimientos` con `codigo IN ('CI-00','CI-01')` y `tratamiento_id NULL`; columna `consentimientos_firmados.autoriza_fotos BOOLEAN` (nullable).

- [ ] **Step 1: Escribir la migración**

```sql
-- backend/src/db/migrations/029_consentimientos_generales.sql
-- Consentimientos generales por paciente (no por tratamiento): CI-00 Aviso de
-- Privacidad y CI-01 Carta Compromiso. Fuente: CONSENTIMIENTOS INFORMADOS
-- GIOVAL.docx (versión final). CI-12 (fotografía) se fusiona en CI-01.

ALTER TABLE consentimientos ADD COLUMN IF NOT EXISTS codigo VARCHAR(10) UNIQUE;
ALTER TABLE consentimientos_firmados ADD COLUMN IF NOT EXISTS autoriza_fotos BOOLEAN;

INSERT INTO consentimientos (codigo, titulo, texto_consentimiento, activo)
VALUES (
  'CI-00',
  'Aviso de Privacidad Integral',
  'IDENTIDAD Y DOMICILIO DEL RESPONSABLE GIOVAL Medicina Estética, S.C. — Dra. Itzel Giovanna Valencia López. Morelia, Michoacán, México · Teléfono: 4521709387 · info@gioval.mx · @gioval.mx DATOS PERSONALES QUE SE RECABAN El Responsable recaba las siguientes categorías de datos personales: ▸ Identificación y contacto: nombre completo, fecha de nacimiento, sexo, domicilio, teléfono, correo electrónico. ▸ Datos patrimoniales: información de pago (no se almacenan datos bancarios completos). ▸ Datos de salud (sensibles): historia clínica, diagnósticos, medicamentos, antecedentes heredofamiliares, resultados de laboratorio, fotografías clínicas, medidas antropométricas y bioimpedancia. ▸ Datos de emergencia: nombre y teléfono de contacto de emergencia. FINALIDADES DEL TRATAMIENTO Finalidades primarias (necesarias para la relación médico-paciente): ▸ Elaboración y resguardo del expediente clínico (NOM-004-SSA3-2012). ▸ Prestación de servicios de medicina estética, corporal, funcional, regenerativa y capilar. ▸ Seguimiento del tratamiento, evolución y resultados. ▸ Contacto para citas, recordatorios y seguimiento post-procedimiento. ▸ Emisión de facturas y comprobantes de pago. Finalidades secundarias (puede oponerse sin afectar la atención): ▸ Envío de información sobre nuevos servicios, promociones y eventos de la clínica. ▸ Uso académico o de difusión de casos clínicos de forma anonimizada. ▸ Estadísticas internas y mejora de procesos clínicos. TRANSFERENCIAS DE DATOS El Responsable NO realizará transferencias de datos personales a terceros sin consentimiento del titular, salvo en los siguientes casos previstos por la ley: (1) cuando sea requerido por autoridad competente mediante orden judicial o administrativa; (2) en caso de emergencia médica que requiera traslado o atención especializada; (3) cuando sea necesario para la prevención o diagnóstico médico, prestación de asistencia sanitaria o gestión de servicios de salud. DERECHOS ARCO Y MECANISMO DE EJERCICIO El titular de los datos tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (derechos ARCO) al tratamiento de sus datos personales. Para ejercerlos, deberá presentar solicitud escrita al correo info@gioval.mx indicando: nombre completo, descripción del derecho a ejercer y, en su caso, documentos que acrediten su identidad. El Responsable dará respuesta en un plazo máximo de 20 días hábiles. MEDIDAS DE SEGURIDAD El Responsable ha implementado medidas técnicas, administrativas y físicas para proteger sus datos personales contra daño, pérdida, alteración, destrucción o uso no autorizado, en cumplimiento de los Artículos 19 y 20 de la LFPDPPP. Los expedientes físicos se resguardan en instalaciones con acceso restringido; los expedientes digitales se protegen mediante acceso con contraseña y respaldo periódico. CAMBIOS AL AVISO DE PRIVACIDAD Cualquier modificación al presente Aviso de Privacidad será notificada al titular mediante aviso visible en las instalaciones de la clínica y/o por correo electrónico registrado, con al menos 15 días naturales de anticipación a su entrada en vigor.',
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  texto_consentimiento = EXCLUDED.texto_consentimiento;

INSERT INTO consentimientos (codigo, titulo, texto_consentimiento, activo)
VALUES (
  'CI-01',
  'Carta Compromiso del Paciente',
  'COMPROMISOS DEL PACIENTE Como paciente de GIOVAL Medicina Estética me comprometo a cumplir con los siguientes puntos: INFORMACIÓN Y VERACIDAD ▸ Proporcionar información veraz, completa y actualizada sobre mi estado de salud, medicamentos, alergias, hábitos y antecedentes médicos. ▸ Notificar de inmediato al médico cualquier cambio en mi estado de salud o nuevo medicamento. ▸ Informar si estoy embarazada, en período de lactancia, o si existe la posibilidad de estarlo. APEGO AL TRATAMIENTO ▸ Seguir estrictamente las indicaciones pre y post-procedimiento proporcionadas por el médico. ▸ Asistir a todas las citas programadas. En caso de no poder asistir, cancelar con mínimo 24 horas. ▸ Completar el número de sesiones recomendadas. ▸ Realizar los estudios de laboratorio o gabinete que el médico indique. CUIDADOS EN CASA ▸ Aplicar protector solar SPF 30 o mayor todos los días durante y después del tratamiento. ▸ No aplicar productos no indicados por el médico en la zona tratada. ▸ Evitar exposición solar directa, sauna, baños de vapor o actividad física intensa según indicación médica. ▸ Mantener una adecuada hidratación oral y alimentación equilibrada. RESPONSABILIDAD Y EXPECTATIVAS ▸ Entender que los resultados son variables según cada persona y no existe garantía de resultados específicos. ▸ Asumir que el tabaquismo, alcohol, sedentarismo y exposición solar sin protección afectan negativamente los resultados. ▸ Acudir al servicio de urgencias o notificar al médico ante cualquier signo de alarma. POLÍTICA DE CANCELACIÓN Y REEMBOLSOS Las cancelaciones con menos de 24 horas o inasistencias sin previo aviso podrán generar cargo administrativo. Los paquetes adquiridos no son reembolsables una vez iniciadas las sesiones; en caso de contraindicación médica sobrevenida se evaluará individualmente. FOTOGRAFÍA CLÍNICA GIOVAL Medicina Estética toma fotografías estandarizadas antes, durante y después del tratamiento con fines exclusivamente clínicos y de seguimiento. Para uso en difusión o redes sociales se requerirá la autorización indicada a continuación.',
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  texto_consentimiento = EXCLUDED.texto_consentimiento;
```

- [ ] **Step 2: Aplicar la migración arrancando el backend**

Run: `cd ~/elys/backend && npm run dev`
Expected (en consola, una sola vez): `Migración aplicada: 029_consentimientos_generales.sql`
Dejar el proceso corriendo (se usará en los siguientes tasks) o detenerlo con Ctrl+C una vez visto el mensaje.

- [ ] **Step 3: Escribir el script de verificación**

```js
// backend/src/scripts/test_consentimientos_generales.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const assert = require('assert');
const pool = require('../db/pool');

async function run() {
  const { rows } = await pool.query(
    `SELECT codigo, titulo, texto_consentimiento, tratamiento_id
     FROM consentimientos WHERE codigo IN ('CI-00','CI-01') ORDER BY codigo`
  );
  assert.strictEqual(rows.length, 2, `esperaba 2 filas generales, encontré ${rows.length}`);
  assert.strictEqual(rows[0].codigo, 'CI-00');
  assert.strictEqual(rows[1].codigo, 'CI-01');
  for (const r of rows) {
    assert.ok(r.texto_consentimiento && r.texto_consentimiento.length > 100, `${r.codigo} sin texto`);
    assert.strictEqual(r.tratamiento_id, null, `${r.codigo} no debería tener tratamiento_id`);
  }
  console.log('✓ CI-00 y CI-01 sembrados correctamente');
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 4: Ejecutar el script y verificar que pasa**

Run: `cd ~/elys/backend && node src/scripts/test_consentimientos_generales.js`
Expected: `✓ CI-00 y CI-01 sembrados correctamente` (exit code 0, sin stack trace)

- [ ] **Step 5: Commit**

```bash
cd ~/elys
git add backend/src/db/migrations/029_consentimientos_generales.sql backend/src/scripts/test_consentimientos_generales.js
git commit -m "feat: seed CI-00 y CI-01 como consentimientos generales por paciente"
```

---

### Task 2: Backend — buscar/editar por `codigo`, firmar con `autoriza_fotos`

**Files:**
- Modify: `backend/src/models/consentimiento.js`
- Modify: `backend/src/controllers/consentimientosController.js`
- Modify: `backend/src/routes/consentimientos.js`

**Interfaces:**
- Consumes: tabla `consentimientos.codigo` y `consentimientos_firmados.autoriza_fotos` de Task 1.
- Produces: `Consentimiento.findByCodigo(codigo)`, `Consentimiento.upsertGeneral(codigo, data, userId)`; rutas `GET/PUT /api/consentimientos/general/:codigo`; `findFirmadosByPaciente` ahora incluye `codigo`; `createFirmado` acepta `autoriza_fotos`.

- [ ] **Step 1: Agregar `findByCodigo` y `upsertGeneral` al modelo**

Modify `backend/src/models/consentimiento.js` — agregar estas dos funciones dentro del objeto `Consentimiento`, justo después de `upsert` (después de la línea que cierra `upsert` con `return rows[0];\n  },`):

```js
  async findByCodigo(codigo) {
    const { rows } = await pool.query(
      'SELECT * FROM consentimientos WHERE codigo = $1',
      [codigo]
    );
    return rows[0] || null;
  },

  async upsertGeneral(codigo, data, userId) {
    const { titulo, texto_consentimiento, activo } = data;
    const { rows } = await pool.query(
      `INSERT INTO consentimientos (codigo, titulo, texto_consentimiento, activo, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (codigo) DO UPDATE SET
         titulo = EXCLUDED.titulo,
         texto_consentimiento = EXCLUDED.texto_consentimiento,
         activo = EXCLUDED.activo,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [codigo, titulo, texto_consentimiento, activo ?? true, userId]
    );
    return rows[0];
  },
```

- [ ] **Step 2: Incluir `codigo` en `findFirmadosByPaciente` y `autoriza_fotos` en `createFirmado`**

Modify `backend/src/models/consentimiento.js`, función `findFirmadosByPaciente` — cambiar el `SELECT`:

```js
  async findFirmadosByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT cf.*, c.titulo, c.codigo, c.cuidados_post
       FROM consentimientos_firmados cf
       JOIN consentimientos c ON c.id = cf.consentimiento_id
       WHERE cf.paciente_id = $1
       ORDER BY cf.fecha_firmado DESC`,
      [pacienteId]
    );
    return rows;
  },
```

Modify `createFirmado` para aceptar y guardar `autoriza_fotos`:

```js
  async createFirmado(data) {
    const { consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por, autoriza_fotos } = data;
    const { rows } = await pool.query(
      `INSERT INTO consentimientos_firmados
         (consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por, autoriza_fotos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, firmado_por, autoriza_fotos ?? null]
    );
    return rows[0];
  },
```

- [ ] **Step 3: Agregar controllers**

Modify `backend/src/controllers/consentimientosController.js` — agregar después de `exports.save`:

```js
exports.getByCodigo = async (req, res, next) => {
  try {
    const data = await Consentimiento.findByCodigo(req.params.codigo);
    res.json(data || {});
  } catch (e) { next(e); }
};

exports.saveGeneral = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const data = await Consentimiento.upsertGeneral(req.params.codigo, req.body, req.user.id);
    res.json(data);
  } catch (e) { next(e); }
};
```

Modify `exports.firmar` para pasar `autoriza_fotos`:

```js
exports.firmar = async (req, res, next) => {
  try {
    const { consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre, firma_imagen, autoriza_fotos } = req.body;
    if (!firma_imagen || !consentimiento_id || !paciente_id || !nombre_paciente) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    const data = await Consentimiento.createFirmado({
      consentimiento_id, paciente_id, cita_id, nombre_paciente, tratamiento_nombre,
      firma_imagen, firmado_por: req.user.id, autoriza_fotos
    });
    res.status(201).json(data);
  } catch (e) { next(e); }
};
```

- [ ] **Step 4: Agregar rutas**

Modify `backend/src/routes/consentimientos.js`:

```js
const router = require('express').Router();
const ctrl = require('../controllers/consentimientosController');

router.get('/tratamiento/:tratamientoId', ctrl.getByTratamiento);
router.put('/tratamiento/:tratamientoId', ctrl.save);
router.get('/general/:codigo', ctrl.getByCodigo);
router.put('/general/:codigo', ctrl.saveGeneral);
router.get('/firmados/paciente/:pacienteId', ctrl.getFirmadosByPaciente);
router.get('/firmados/cita/:citaId', ctrl.getFirmadoByCita);
router.post('/firmar', ctrl.firmar);

module.exports = router;
```

- [ ] **Step 5: Extender el script de verificación para cubrir backend**

Modify `backend/src/scripts/test_consentimientos_generales.js` — agregar antes de `console.log('✓ ...')` y de `await pool.end();`:

```js
  const Consentimiento = require('../models/consentimiento');
  const ci00 = await Consentimiento.findByCodigo('CI-00');
  assert.ok(ci00?.id, 'findByCodigo(CI-00) no encontró nada');

  const { rows: pacienteRows } = await pool.query('SELECT id FROM pacientes LIMIT 1');
  if (pacienteRows.length) {
    const pacienteId = pacienteRows[0].id;
    const firmado = await Consentimiento.createFirmado({
      consentimiento_id: ci00.id, paciente_id: pacienteId, cita_id: null,
      nombre_paciente: 'Test Paciente', tratamiento_nombre: null,
      firma_imagen: 'data:image/png;base64,test', firmado_por: null,
      autoriza_fotos: true,
    });
    assert.ok(firmado.id, 'createFirmado no devolvió id');
    const firmados = await Consentimiento.findFirmadosByPaciente(pacienteId);
    const encontrado = firmados.find(f => f.id === firmado.id);
    assert.ok(encontrado, 'findFirmadosByPaciente no regresó el firmado de prueba');
    assert.strictEqual(encontrado.codigo, 'CI-00');
    assert.strictEqual(encontrado.autoriza_fotos, true);
    await pool.query('DELETE FROM consentimientos_firmados WHERE id = $1', [firmado.id]);
    console.log('✓ firmar/listar consentimiento general con autoriza_fotos funciona');
  } else {
    console.log('⚠ sin pacientes en BD, se omite prueba de firmado (no es error)');
  }
```

- [ ] **Step 6: Ejecutar el script extendido**

Run: `cd ~/elys/backend && node src/scripts/test_consentimientos_generales.js`
Expected: ambos mensajes `✓ ...` impresos, sin error.

- [ ] **Step 7: Commit**

```bash
cd ~/elys
git add backend/src/models/consentimiento.js backend/src/controllers/consentimientosController.js backend/src/routes/consentimientos.js backend/src/scripts/test_consentimientos_generales.js
git commit -m "feat: endpoints backend para consentimientos generales y autoriza_fotos"
```

---

### Task 3: Frontend — API wrapper + checkbox de fotos en el modal de firma

**Files:**
- Modify: `frontend/src/api/consentimientos.js`
- Modify: `frontend/src/components/ConsentimientoFirmaModal.jsx`

**Interfaces:**
- Consumes: rutas `GET/PUT /api/consentimientos/general/:codigo` de Task 2.
- Produces: `getConsentimientoGeneral(codigo)`, `saveConsentimientoGeneral(codigo, data)`; `ConsentimientoFirmaModal` envía `autoriza_fotos` en el payload de `firmarConsentimiento` cuando `consentimiento.codigo === 'CI-01'`.

- [ ] **Step 1: Agregar funciones a la API**

Modify `frontend/src/api/consentimientos.js`:

```js
import api from './client';

export const getConsentimiento = (tratamientoId) =>
  api.get(`/consentimientos/tratamiento/${tratamientoId}`).then(r => r.data);

export const saveConsentimiento = (tratamientoId, data) =>
  api.put(`/consentimientos/tratamiento/${tratamientoId}`, data).then(r => r.data);

export const getConsentimientoGeneral = (codigo) =>
  api.get(`/consentimientos/general/${codigo}`).then(r => r.data);

export const saveConsentimientoGeneral = (codigo, data) =>
  api.put(`/consentimientos/general/${codigo}`, data).then(r => r.data);

export const getFirmadosByPaciente = (pacienteId) =>
  api.get(`/consentimientos/firmados/paciente/${pacienteId}`).then(r => r.data);

export const getFirmadoByCita = (citaId) =>
  api.get(`/consentimientos/firmados/cita/${citaId}`).then(r => r.data);

export const firmarConsentimiento = (data) =>
  api.post('/consentimientos/firmar', data).then(r => r.data);
```

- [ ] **Step 2: Agregar estado y checkbox condicional en el modal de firma**

Modify `frontend/src/components/ConsentimientoFirmaModal.jsx` — agregar estado junto a los demás `useState` (después de la línea `const [error, setError] = useState('');`):

```js
  const [autorizaFotos, setAutorizaFotos] = useState(null);
  const requiereFotos = consentimiento.codigo === 'CI-01';
```

- [ ] **Step 3: Validar y enviar `autoriza_fotos` en `handleFirmar`**

Modify la función `handleFirmar` completa:

```js
  async function handleFirmar() {
    if (requiereFotos && autorizaFotos === null) {
      setError('Selecciona una opción de autorización de fotografías.');
      return;
    }
    if (sigRef.current?.isEmpty()) {
      setError('Por favor dibuje la firma antes de continuar.');
      return;
    }
    setLoading(true); setError('');
    try {
      const firma_imagen = sigRef.current.toDataURL();
      await firmarConsentimiento({
        consentimiento_id: consentimiento.id,
        paciente_id: paciente.id,
        cita_id: cita?.id || null,
        nombre_paciente: nombreCompleto,
        tratamiento_nombre: procedimiento || consentimiento.titulo || '',
        firma_imagen,
        autoriza_fotos: requiereFotos ? autorizaFotos : null,
      });
      onFirmado?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la firma');
    } finally { setLoading(false); }
  }
```

- [ ] **Step 4: Renderizar el checkbox antes de la firma**

Modify el JSX — insertar este bloque justo antes del `<div className="border-t pt-4" ...>` que contiene la declaración y `SignaturePad`:

```jsx
          {requiereFotos && (
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-sage)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                Autorización de fotografía clínica
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="autorizaFotos" checked={autorizaFotos === true}
                         onChange={() => setAutorizaFotos(true)} />
                  Autorizo el uso de mis fotografías clínicas para fines académicos y/o difusión en redes sociales
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="autorizaFotos" checked={autorizaFotos === false}
                         onChange={() => setAutorizaFotos(false)} />
                  NO autorizo
                </label>
              </div>
            </div>
          )}
```

- [ ] **Step 5: Verificar que el frontend compila**

Run: `cd ~/elys/frontend && npm run build`
Expected: `✓ built in ...` sin errores de sintaxis ni de import.

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add frontend/src/api/consentimientos.js frontend/src/components/ConsentimientoFirmaModal.jsx
git commit -m "feat: checkbox de autorización de fotos en firma de CI-01"
```

---

### Task 4: Frontend — banner de pendientes y aterrizaje tras alta de paciente

**Files:**
- Modify: `frontend/src/pages/PacienteDetallePage.jsx`
- Modify: `frontend/src/pages/PacientesPage.jsx`

**Interfaces:**
- Consumes: `getConsentimientoGeneral` (Task 3), `consentsFirmados[].codigo` (Task 2).
- Produces: navegación con `location.state.tab` para abrir la pestaña Consentimientos al crear un paciente.

- [ ] **Step 1: Importar `getConsentimientoGeneral` y `useLocation`**

Modify `frontend/src/pages/PacienteDetallePage.jsx` línea 2 y línea 7:

```js
import { useParams, useNavigate, useLocation } from 'react-router-dom';
```
```js
import { getConsentimiento, getConsentimientoGeneral, getFirmadosByPaciente } from '../api/consentimientos';
```

- [ ] **Step 2: Inicializar `tab` desde `location.state`**

Modify las líneas 34-40 (declaración del componente):

```js
export default function PacienteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const rol = localStorage.getItem('rol');
  const [paciente, setPaciente] = useState(null);
  const [historia, setHistoria] = useState(null);
  const [notas, setNotas] = useState([]);
  const [tab, setTab] = useState(location.state?.tab || 'historia');
```

- [ ] **Step 3: Agregar el banner de generales pendientes**

Modify dentro del bloque `{tab === 'consentimientos' && (` (línea ~399-400), insertar este IIFE justo antes del IIFE existente de `citasPendientes` (antes de la línea `{(() => { const citasPendientes = ...`):

```jsx
          {(() => {
            const titulos = { 'CI-00': 'Aviso de Privacidad', 'CI-01': 'Carta Compromiso del Paciente' };
            const generalesFaltantes = ['CI-00', 'CI-01'].filter(
              cod => !consentsFirmados.some(cf => cf.codigo === cod)
            );
            if (!generalesFaltantes.length) return null;
            const codigo = generalesFaltantes[0];
            return (
              <div className="mb-4 p-4 rounded-xl border-2" style={{ borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-cream)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-dark)' }}>
                  {titulos[codigo]} pendiente{generalesFaltantes.length > 1 ? ` (y ${generalesFaltantes.length - 1} más)` : ''}
                </p>
                <button
                  onClick={async () => {
                    try {
                      const consent = await getConsentimientoGeneral(codigo);
                      if (consent?.id) setConsentModal({ consentimiento: consent, cita: null });
                    } catch {}
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--color-accent)' }}>
                  Firmar ahora
                </button>
              </div>
            );
          })()}

```

- [ ] **Step 4: Navegar al expediente tras crear un paciente nuevo**

Modify `frontend/src/pages/PacientesPage.jsx`, el bloque final del componente:

```jsx
      {modal && (
        <PacienteFormModal
          onClose={() => setModal(false)}
          onSaved={(saved) => navigate(`/pacientes/${saved.id}`, { state: { tab: 'consentimientos' } })}
        />
      )}
```

- [ ] **Step 5: Verificar que el frontend compila**

Run: `cd ~/elys/frontend && npm run build`
Expected: `✓ built in ...` sin errores.

- [ ] **Step 6: Prueba manual del flujo completo**

Con backend (`npm run dev` en `backend/`) y frontend (`npm run dev` en `frontend/`) corriendo:
1. Login como `admin@elys.com` / `Admin123!`.
2. Ir a Pacientes → "+ Nueva paciente" → llenar datos mínimos → Guardar.
3. Confirmar que aterriza en el expediente del paciente con la pestaña "Consentimientos" abierta y el banner "Aviso de Privacidad pendiente" visible.
4. Click "Firmar ahora" → confirmar que se ve el texto de CI-00, sin checkbox de fotos, firmar con el canvas → confirmar que el banner cambia a "Carta Compromiso del Paciente pendiente".
5. Click "Firmar ahora" otra vez → confirmar que aparece el checkbox de autorización de fotos antes de poder firmar → seleccionar una opción → firmar.
6. Confirmar que el banner desaparece y ambos quedan listados abajo como firmados.
7. Abrir un paciente creado antes de este cambio (cualquiera de los ya existentes) → confirmar que también ve el mismo banner.

- [ ] **Step 7: Commit**

```bash
cd ~/elys
git add frontend/src/pages/PacienteDetallePage.jsx frontend/src/pages/PacientesPage.jsx
git commit -m "feat: banner de consentimientos generales pendientes y aterrizaje tras alta"
```

---

### Task 5: Frontend — edición admin de CI-00/CI-01

**Files:**
- Modify: `frontend/src/components/ConsentimientoEditModal.jsx`
- Modify: `frontend/src/pages/TratamientosPage.jsx`

**Interfaces:**
- Consumes: `getConsentimientoGeneral`/`saveConsentimientoGeneral` (Task 3).
- Produces: `ConsentimientoEditModal` acepta `general={{ codigo, titulo }}` como alternativa a `tratamiento={{ id }}`.

- [ ] **Step 1: Generalizar `ConsentimientoEditModal`**

Modify `frontend/src/components/ConsentimientoEditModal.jsx` completo:

```jsx
import { useState, useEffect } from 'react';
import { getConsentimiento, saveConsentimiento, getConsentimientoGeneral, saveConsentimientoGeneral } from '../api/consentimientos';

export default function ConsentimientoEditModal({ tratamiento, general, onClose, onSaved }) {
  const esGeneral = !!general;
  const titulo = esGeneral ? general.titulo : tratamiento.nombre;

  const [form, setForm] = useState({
    titulo: '',
    texto_consentimiento: '',
    cuidados_pre: '',
    cuidados_post: '',
    activo: true,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const fetcher = esGeneral ? getConsentimientoGeneral(general.codigo) : getConsentimiento(tratamiento.id);
    fetcher
      .then(d => { if (d?.id) setForm({ titulo: d.titulo || '', texto_consentimiento: d.texto_consentimiento || '', cuidados_pre: d.cuidados_pre || '', cuidados_post: d.cuidados_post || '', activo: d.activo ?? true }); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [esGeneral, general?.codigo, tratamiento?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (esGeneral) await saveConsentimientoGeneral(general.codigo, form);
      else await saveConsentimiento(tratamiento.id, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-5 border-b flex justify-between items-start" style={{ borderColor: 'var(--color-sage)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--color-dark)' }}>Consentimiento informado</h2>
            <p className="text-xs text-gray-500 mt-0.5">{titulo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando…</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título del consentimiento</label>
              <input type="text" value={form.titulo}
                     onChange={e => set('titulo', e.target.value)}
                     placeholder="ej. Consentimiento Informado — Toxina Botulínica"
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Texto del consentimiento *</label>
              <p className="text-xs text-gray-400 mb-1">Describe el procedimiento, riesgos, alternativas y declaración del paciente.</p>
              <textarea rows={10} value={form.texto_consentimiento}
                        onChange={e => set('texto_consentimiento', e.target.value)}
                        placeholder="Yo, el/la paciente, declaro haber sido informado/a sobre el procedimiento…"
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                        style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            {!esGeneral && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cuidados previos al tratamiento</label>
                  <textarea rows={4} value={form.cuidados_pre}
                            onChange={e => set('cuidados_pre', e.target.value)}
                            placeholder="• No usar maquillaje el día del procedimiento&#10;• Evitar alcohol 24h antes…"
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                            style={{ borderColor: 'var(--color-primary)' }} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cuidados posteriores al tratamiento</label>
                  <textarea rows={4} value={form.cuidados_post}
                            onChange={e => set('cuidados_post', e.target.value)}
                            placeholder="• No exponerse al sol las primeras 48h&#10;• Aplicar crema hidratante…"
                            className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                            style={{ borderColor: 'var(--color-primary)' }} />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" checked={form.activo}
                     onChange={e => set('activo', e.target.checked)}
                     className="rounded" />
              <label htmlFor="activo" className="text-sm text-gray-600">Activo (requerir firma a pacientes)</label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando…' : 'Guardar consentimiento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Agregar bloque admin en `TratamientosPage`**

Modify `frontend/src/pages/TratamientosPage.jsx` — insertar este bloque justo después del `{rol === 'admin' && (<form>...</form>)}` que termina antes de `<div className="space-y-3">` (línea ~131):

```jsx
      {rol === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex gap-3 flex-wrap"
             style={{ borderColor: 'var(--color-sage)' }}>
          <p className="text-xs font-medium text-gray-600 w-full">Consentimientos Generales (se firman al registrar al paciente)</p>
          <button onClick={() => setConsentModal({ general: { codigo: 'CI-00', titulo: 'Aviso de Privacidad Integral' } })}
                  className="text-xs px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
            Editar CI-00 · Aviso de Privacidad
          </button>
          <button onClick={() => setConsentModal({ general: { codigo: 'CI-01', titulo: 'Carta Compromiso del Paciente' } })}
                  className="text-xs px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
            Editar CI-01 · Carta Compromiso
          </button>
        </div>
      )}

```

- [ ] **Step 3: Adaptar el render del modal para distinguir tratamiento vs. general**

Modify el bloque final de `TratamientosPage.jsx` (donde se renderiza `ConsentimientoEditModal`):

```jsx
      {consentModal && (
        <ConsentimientoEditModal
          tratamiento={consentModal.general ? undefined : consentModal}
          general={consentModal.general}
          onClose={() => setConsentModal(null)}
          onSaved={() => setConsentModal(null)}
        />
      )}
```

- [ ] **Step 4: Verificar que el frontend compila**

Run: `cd ~/elys/frontend && npm run build`
Expected: `✓ built in ...` sin errores.

- [ ] **Step 5: Prueba manual**

Con frontend+backend corriendo, login admin → Tratamientos → confirmar bloque "Consentimientos Generales" arriba de la tabla → "Editar CI-00" → confirmar que carga el texto sembrado, sin campos de cuidados pre/post → editar el título → Guardar → reabrir y confirmar que persistió.

- [ ] **Step 6: Commit**

```bash
cd ~/elys
git add frontend/src/components/ConsentimientoEditModal.jsx frontend/src/pages/TratamientosPage.jsx
git commit -m "feat: edición admin de consentimientos generales CI-00/CI-01"
```

---

### Task 6: Deploy

**Files:** ninguno nuevo — usa `~/elys/deploy.sh` existente.

- [ ] **Step 1: Rebuild del frontend admin**

Run: `cd ~/elys/frontend && npm run build`
Expected: build sin errores (ya verificado en tasks anteriores, se repite por ser el paso que toma `deploy.sh`).

- [ ] **Step 2: Deploy**

Run: `cd ~/elys && ./deploy.sh`
Expected: sincroniza backend + `frontend/dist/` al servidor `62.238.3.136` y reinicia PM2 `elys-backend` (la migración 029 se aplica sola al reiniciar el backend en producción).

- [ ] **Step 3: Verificar en producción**

Login en `http://62.238.3.136:8088` como admin, repetir el flujo manual del Task 4 Step 6 contra producción (crear un paciente de prueba o usar uno existente sin firmas).
