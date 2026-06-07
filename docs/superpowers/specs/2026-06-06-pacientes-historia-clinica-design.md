# Diseño — Módulo Pacientes + Expediente Clínico
**Proyecto:** Elys — Gioval Medicina Estética  
**Fecha:** 2026-06-06  
**Basado en:** Formulario Historia Clínica Gioval (I_GIO_30.3MAY.pdf) + PNO-05-2026 (NOM-004-SSA3-2012)

---

## 1. Objetivo

Digitalizar el expediente clínico de pacientes de Gioval Medicina Estética conforme a la NOM-004-SSA3-2012, integrando:
- Registro y búsqueda de pacientes
- Historia clínica única por paciente (formulario oficial Gioval)
- Nota de evolución por cada cita (acto médico)
- Vinculación de citas al paciente registrado

---

## 2. Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Arquitectura | Opción A — relacional limpia | Historia clínica y notas vinculadas por FK, sin texto libre en citas nuevas |
| Historia clínica | Una por paciente | Se llena en la primera visita, editable después |
| Identificador NOM | apellido_paterno + apellido_materno + nombre | Requerimiento NOM-004-SSA3-2012 |
| Citas existentes | Sin migración | Se deja `nombre_paciente` texto en citas antiguas; solo citas nuevas usan `paciente_id` |
| Paciente no registrado en cita | Mini modal nombre+teléfono | Registro rápido sin salir del flujo de citas |
| Perfil del paciente | Historia clínica + historial citas + notas de visita | Expediente completo en una sola vista |

---

## 3. Base de datos

### 3.1 Tabla `pacientes`
```sql
CREATE TABLE pacientes (
  id              SERIAL PRIMARY KEY,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100),
  nombre           VARCHAR(100) NOT NULL,
  fecha_registro   DATE,
  fecha_nacimiento DATE,
  edad             INTEGER,
  sexo             VARCHAR(20),
  ocupacion        VARCHAR(100),
  estado_civil     VARCHAR(30),
  telefono         VARCHAR(20),
  email            VARCHAR(150),
  direccion        TEXT,
  anotaciones      TEXT,
  created_by       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 Tabla `historias_clinicas`
Una por paciente. Se crea vacía al registrar al paciente y se llena en la primera consulta.

```sql
CREATE TABLE historias_clinicas (
  id           SERIAL PRIMARY KEY,
  paciente_id  INTEGER UNIQUE NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,

  -- Antecedentes heredofamiliares (booleanos)
  ah_diabetes          BOOLEAN DEFAULT false,
  ah_cardiopatias      BOOLEAN DEFAULT false,
  ah_hematologicas     BOOLEAN DEFAULT false,
  ah_hipertension      BOOLEAN DEFAULT false,
  ah_nefropatias       BOOLEAN DEFAULT false,
  ah_oncologicos       BOOLEAN DEFAULT false,
  ah_endocrinologicas  BOOLEAN DEFAULT false,
  ah_otras             BOOLEAN DEFAULT false,
  ah_otras_texto       TEXT,

  -- Antecedentes personales patológicos
  -- JSONB: { "diabetes": {"tiene": true, "evolucion": "5 años"}, ... }
  app_datos  JSONB DEFAULT '{}',

  -- Antecedentes no patológicos
  ejercicio            TEXT,
  ingesta_agua         TEXT,
  alimentacion         TEXT,
  trastornos_alim      TEXT,
  apetito              TEXT,
  antojos              TEXT,
  nivel_energia        TEXT,
  nivel_motivacion     TEXT,

  -- Antecedentes gineco-obstétricos
  menarca              TEXT,
  fum                  TEXT,
  ritmo_menstrual      TEXT,
  gesta                TEXT,
  partos               TEXT,
  abortos              TEXT,
  cesareas             TEXT,
  complicaciones_emb   TEXT,
  mac                  TEXT,

  -- Rutina de cuidado de la piel
  piel_limpieza         TEXT,
  piel_hidratacion      TEXT,
  piel_proteccion_solar TEXT,
  piel_rutina_noche     TEXT,
  piel_desmaquillar     TEXT,
  piel_exposicion_sol   TEXT,
  piel_retoque_protector TEXT,
  piel_tiempo_dedicado  TEXT,

  -- Motivo de consulta (checkboxes)
  mc_envejecimiento     BOOLEAN DEFAULT false,
  mc_estrias            BOOLEAN DEFAULT false,
  mc_deshidratacion     BOOLEAN DEFAULT false,
  mc_adiposidad         BOOLEAN DEFAULT false,
  mc_hiperpigmentacion  BOOLEAN DEFAULT false,
  mc_obesidad           BOOLEAN DEFAULT false,
  mc_acne               BOOLEAN DEFAULT false,
  mc_flacidez           BOOLEAN DEFAULT false,
  mc_especifique        TEXT,

  -- Tratamientos previos (faciales y corporales)
  -- JSONB: [{ "tratamiento": "Toxina botulínica", "producto": "Bocouture", "fecha": "2024-01" }]
  trat_prev_faciales   JSONB DEFAULT '[]',
  trat_prev_corporales JSONB DEFAULT '[]',

  -- Exploración física
  fitzpatrick          INTEGER CHECK (fitzpatrick BETWEEN 1 AND 6),
  glogau               INTEGER CHECK (glogau BETWEEN 1 AND 4),
  tipo_rostro          TEXT,
  tipo_piel            TEXT,
  lesiones_derm        TEXT,
  tipo_lesion          TEXT,
  localizacion         TEXT,

  -- Signos vitales
  sv_fc                TEXT,
  sv_fr                TEXT,
  sv_ta                TEXT,
  sv_temperatura       TEXT,
  sv_saturacion        TEXT,
  sv_peso              TEXT,
  sv_talla             TEXT,
  sv_imc               TEXT,

  -- Medidas corporales (cm)
  med_cintura          TEXT,
  med_cadera           TEXT,
  med_muslo            TEXT,
  med_brazo            TEXT,

  -- Procedimiento a realizar
  procedimiento_realizar TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);
```

Campos `app_datos` — claves fijas del JSONB:
`diabetes_mellitus`, `hipertension_arterial`, `alergicos`, `transfusiones`, `traumatismos`, `hospitalizaciones`, `quirurgicos`, `lesiones_dermatologicas`, `enf_endocrinas`, `enf_psiquiatricas`, `epilepsia`, `adicciones`

### 3.3 Tabla `notas_visita` (nota de evolución NOM)
```sql
CREATE TABLE notas_visita (
  id                      SERIAL PRIMARY KEY,
  cita_id                 INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  paciente_id             INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  evolucion               TEXT,
  diagnostico             TEXT,
  pronostico              TEXT,
  tratamiento_indicaciones TEXT,
  signos_vitales          JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);
```

### 3.4 Modificación a `citas`
```sql
ALTER TABLE citas ADD COLUMN paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL;
```
`nombre_paciente` y `telefono` se mantienen como nullable para citas existentes.

---

## 4. Backend

### Rutas nuevas
```
GET    /api/pacientes              lista paginada
POST   /api/pacientes              crear paciente + historia vacía
GET    /api/pacientes/buscar?q=    autocomplete (nombre/teléfono) — mín 2 chars
GET    /api/pacientes/:id          detalle + historia + citas + notas
PUT    /api/pacientes/:id          editar datos generales
GET    /api/historias-clinicas/:pacienteId   leer historia clínica
PUT    /api/historias-clinicas/:pacienteId   guardar/actualizar historia
GET    /api/notas-visita?cita_id=  leer nota de una cita
POST   /api/notas-visita           crear nota
PUT    /api/notas-visita/:id       editar nota
```

### Acceso por rol
| Acción | admin | asistente |
|---|---|---|
| Ver pacientes | ✓ | ✓ |
| Crear/editar paciente | ✓ | ✓ |
| Ver historia clínica | ✓ | ✓ |
| Editar historia clínica | ✓ | ✓ |
| Crear/editar nota de visita | ✓ | ✓ |
| Eliminar paciente | ✓ | ✗ |

---

## 5. Frontend

### 5.1 Navegación
Agregar ítem **Pacientes** en el menú lateral entre Citas y Tratamientos.

### 5.2 PacientesPage
- Listado con buscador en tiempo real (nombre completo o teléfono)
- Columnas: nombre completo, teléfono, fecha registro, acciones
- Botón "Nueva paciente" → abre `PacienteFormModal` (datos generales)
- Click en fila → navega a `PacienteDetallePage`

### 5.3 PacienteDetallePage (`/pacientes/:id`)
Tres tabs:

**Tab 1 — Historia Clínica**
Formulario en acordeón con 7 secciones:
1. Datos generales (nombre, edad, sexo, etc.)
2. Antecedentes heredofamiliares (checkboxes en tabla 3 columnas)
3. Antecedentes personales patológicos (tabla con SI/NO/Evolución por patología)
4. Antecedentes no patológicos + hábitos + rutina de piel + gineco-obstétricos
5. Motivo de consulta (checkboxes + especifique)
6. Tratamientos previos faciales y corporales (tablas editables con filas)
7. Exploración física (Fitzpatrick visual, Glogau, signos vitales, medidas)

Botón "Guardar historia" — guarda toda la sección en una sola llamada PUT.

**Tab 2 — Historial de Citas**
- Lista de citas del paciente (fecha, empleada, tratamiento, estatus)
- Chip de color por estatus (pendiente/realizada/cancelada)
- Click en cita → abre `CitaModal` en modo lectura

**Tab 3 — Notas de Visita**
- Lista de notas ordenadas por fecha descendente
- Cada nota muestra: fecha, cita vinculada, evolución (preview), creado por
- Botón "Nueva nota" (solo si hay citas realizadas sin nota)
- Click → abre `NotaVisitaModal`

### 5.4 CitaModal — cambio
- Campo "Nombre paciente" cambia a `<input>` de búsqueda autocomplete
- Escribe ≥ 2 caracteres → dropdown con resultados de `/api/pacientes/buscar`
- Si no hay resultados: botón "Registrar paciente nuevo"
  - Abre mini modal con solo: apellido paterno, nombre, teléfono
  - Al guardar, se pre-selecciona en el campo y continúa el flujo de cita

### 5.5 NotaVisitaModal
Campos:
- Evolución clínica (textarea)
- Diagnóstico (textarea)
- Pronóstico (textarea)
- Tratamiento e indicaciones (textarea)
- Signos vitales opcionales (FC, FR, TA, Temperatura, Saturación, Peso, Talla)

### 5.6 Branding
- Usar logo Gioval (svg/img existente en assets o importado del brandbook)
- Colores del proyecto: lavanda `#cccad8`, lila `#aba3ba`, malva `#887482`, sage `#ced1ca`, crema `#f5f2f0`
- La historia clínica imprimible (futuro): cabecera con logo igual al PDF original

---

## 6. Flujo principal de uso

```
1. Paciente nueva llega a la clínica
2. Asistente abre Pacientes → "Nueva paciente" → captura nombre + teléfono + datos básicos
3. Se crea paciente + historia clínica vacía
4. Asistente o Dra. completa la historia clínica completa (4 secciones)
5. Se agenda la cita buscando a la paciente por nombre en CitaModal
6. Al marcar la cita como "realizada" → se habilita "Agregar nota de visita"
7. Dra. registra nota de evolución (diagnóstico, tratamiento, indicaciones)
8. Todo el historial queda en el perfil de la paciente
```

---

## 7. Archivos a crear/modificar

### Nuevos
```
backend/src/db/migrations/011_pacientes.sql
backend/src/routes/pacientes.js
backend/src/routes/historias-clinicas.js
backend/src/routes/notas-visita.js
backend/src/controllers/pacientesController.js
backend/src/controllers/historiasClinicasController.js
backend/src/controllers/notasVisitaController.js
frontend/src/pages/PacientesPage.jsx
frontend/src/pages/PacienteDetallePage.jsx
frontend/src/components/PacienteFormModal.jsx
frontend/src/components/PacienteMiniModal.jsx
frontend/src/components/NotaVisitaModal.jsx
frontend/src/components/HistoriaClinicaForm.jsx
frontend/src/api/pacientes.js
frontend/src/api/historiasClinicas.js
frontend/src/api/notasVisita.js
```

### Modificados
```
backend/src/index.js                  — registrar nuevas rutas
frontend/src/App.jsx                  — agregar rutas /pacientes y /pacientes/:id
frontend/src/components/Sidebar.jsx   — agregar ítem Pacientes
frontend/src/components/CitaModal.jsx — cambiar campo paciente a autocomplete
```

---

## 8. Fuera de alcance (esta iteración)
- Impresión/PDF de la historia clínica
- Expansión del catálogo de tratamientos (8 categorías del menú)
- Consentimiento informado digital
- Aviso de privacidad digital
