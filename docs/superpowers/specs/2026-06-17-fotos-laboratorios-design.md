# Spec: Fotos de Tratamiento + Laboratorios — Gioval Medicina Estética

**Fecha:** 2026-06-17  
**Proyecto:** Elys / Gioval  
**Contexto:** Agregar dos nuevos apartados en el expediente del paciente (PacienteDetallePage): fotos clínicas ligadas a citas (antes/durante/después) y análisis de laboratorio generales del paciente.

---

## 1. Resumen

Dos funcionalidades independientes que se integran en el expediente del paciente:

1. **Fotos de tratamiento** — galería inline en el tab de Citas, organizada por etapa (antes / durante / después), ligada a cada cita específica.
2. **Laboratorios** — nuevo tab "Laboratorios" con lista de archivos (PDF o imagen) generales del paciente, sin asociación a cita.

Ambas visibles y editables solo por `admin` y `asistente_medico`.

---

## 2. Base de Datos

### Migración 026 — `fotos_cita`

```sql
CREATE TABLE fotos_cita (
  id          SERIAL PRIMARY KEY,
  cita_id     INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  etapa       VARCHAR(10) NOT NULL CHECK (etapa IN ('antes','durante','despues')),
  archivo     TEXT NOT NULL,
  descripcion TEXT,
  creado_por  INTEGER REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fotos_cita_cita_id ON fotos_cita(cita_id);
```

- Una foto por registro; múltiples fotos por cita+etapa permitidas.
- `archivo`: ruta relativa en disco, p. ej. `uploads/fotos-cita/foto-123.jpg`.
- `CASCADE` en borrado de cita.

### Migración 027 — `laboratorios`

```sql
CREATE TABLE laboratorios (
  id          SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  archivo     TEXT NOT NULL,
  fecha       DATE,
  notas       TEXT,
  creado_por  INTEGER REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_laboratorios_paciente_id ON laboratorios(paciente_id);
```

- `archivo`: ruta relativa. Acepta PDF e imágenes (JPG/PNG).
- `fecha` y `notas` son opcionales.

---

## 3. Backend

### Almacenamiento de archivos

- Fotos de cita: `backend/uploads/fotos-cita/` (crear directorio)
- Laboratorios: `backend/uploads/laboratorios/` (crear directorio)
- Multer ya instalado; configurar instancias separadas con `diskStorage` y nombre único (`Date.now() + '-' + originalname`).
- Servir estático: ya configurado `express.static('uploads')` — los nuevos subdirectorios quedan cubiertos.

### Rutas y controladores

**`/api/fotos-cita`** — `routes/fotos-cita.js` + `controllers/fotosCitaController.js` + `models/fotoCita.js`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/fotos-cita?cita_id=X` | Fotos de una cita, agrupadas por etapa |
| POST | `/api/fotos-cita` | Subir foto (multipart: cita_id, paciente_id, etapa, archivo, descripcion?) |
| DELETE | `/api/fotos-cita/:id` | Eliminar foto — solo admin |

- Auth requerida en todos los endpoints (`requireAuth`).
- Upload y GET: `requireRol('admin','asistente_medico')`.
- DELETE: `requireRol('admin')`.

**`/api/laboratorios`** — `routes/laboratorios.js` + `controllers/laboratoriosController.js` + `models/laboratorio.js`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/laboratorios?paciente_id=X` | Lista de laboratorios del paciente |
| POST | `/api/laboratorios` | Subir archivo (multipart: paciente_id, nombre, fecha?, notas?, archivo) |
| DELETE | `/api/laboratorios/:id` | Eliminar — solo admin |

- Auth requerida en todos. Upload/GET: `requireRol('admin','asistente_medico')`. DELETE: `requireRol('admin')`.

### Registro en `index.js`

Agregar las dos rutas nuevas en `backend/src/index.js`:
```js
app.use('/api/fotos-cita', require('./routes/fotos-cita'));
app.use('/api/laboratorios', require('./routes/laboratorios'));
```

---

## 4. Frontend

### API helpers

- `frontend/src/api/fotosCita.js` — `getFotosByCita(cita_id)`, `uploadFotoCita(formData)`, `deleteFotoCita(id)`
- `frontend/src/api/laboratorios.js` — `getLaboratoriosByPaciente(paciente_id)`, `uploadLaboratorio(formData)`, `deleteLaboratorio(id)`

Usar el cliente axios compartido (paths relativos `/api/...`).

### Tab Citas — fotos inline

En `PacienteDetallePage.jsx`, cada fila de la tabla de citas agrega:

1. **Botón "📷 Fotos"** en la columna de acciones (visible solo para `admin` y `asistente_medico`).
2. Al hacer clic, expande un acordeón debajo de esa fila (`<tr>` adicional con `colSpan=5`).
3. El acordeón muestra 3 columnas: **Antes · Durante · Después**.
4. Cada columna: thumbnails de fotos existentes + botón "+" (input file oculto).
5. **Carga lazy**: el fetch a `/api/fotos-cita?cita_id=X` ocurre solo al expandir por primera vez; resultado cacheado en estado local.
6. **Lightbox simple**: clic en thumbnail abre la imagen a tamaño completo en un modal overlay.
7. **Borrar foto**: ícono "×" sobre cada thumbnail, visible solo para `admin`.
8. El label de etapa en el botón muestra el conteo total de fotos de la cita (ej. "📷 Fotos (3)") cuando ya hay fotos cargadas.

Estado en PacienteDetallePage:
```js
const [citaFotosOpen, setCitaFotosOpen] = useState({}); // { [cita_id]: bool }
const [fotosByCita, setFotosByCita] = useState({});      // { [cita_id]: { antes:[], durante:[], despues:[] } }
const [lightbox, setLightbox] = useState(null);           // URL de imagen abierta
```

### Tab nuevo — "Laboratorios"

Posición en el tab bar: después de "Valoraciones y Procedimientos".  
Visibilidad: `rol === 'admin' || rol === 'asistente_medico'`.

**Contenido del tab:**
- Botón "Subir análisis" (arriba a la derecha).
- Tabla: Nombre · Fecha · Notas · Acciones (Ver + Eliminar admin).
- "Ver": abre el archivo en nueva pestaña (`window.open(url, '_blank')`).
- Estado vacío: "Sin análisis de laboratorio registrados."

**Modal de subida** (`LaboratorioModal.jsx`):
- Campos: Nombre* (texto), Fecha (date), Notas (textarea), Archivo* (PDF o imagen)
- Validación: nombre y archivo requeridos.
- Al guardar: POST multipart → recarga lista.

---

## 5. Roles y visibilidad

| Acción | admin | asistente_medico | cosmetista | asistente_general |
|--------|-------|------------------|------------|-------------------|
| Ver fotos cita | ✅ | ✅ | ❌ | ❌ |
| Subir foto | ✅ | ✅ | ❌ | ❌ |
| Eliminar foto | ✅ | ❌ | ❌ | ❌ |
| Ver laboratorios | ✅ | ✅ | ❌ | ❌ |
| Subir laboratorio | ✅ | ✅ | ❌ | ❌ |
| Eliminar laboratorio | ✅ | ❌ | ❌ | ❌ |

---

## 6. Archivos a crear / modificar

### Nuevos
- `backend/src/db/migrations/026_fotos_cita.sql`
- `backend/src/db/migrations/027_laboratorios.sql`
- `backend/src/models/fotoCita.js`
- `backend/src/models/laboratorio.js`
- `backend/src/controllers/fotosCitaController.js`
- `backend/src/controllers/laboratoriosController.js`
- `backend/src/routes/fotos-cita.js`
- `backend/src/routes/laboratorios.js`
- `frontend/src/api/fotosCita.js`
- `frontend/src/api/laboratorios.js`
- `frontend/src/components/LaboratorioModal.jsx`

### Modificados
- `backend/src/index.js` — registrar 2 rutas nuevas
- `frontend/src/pages/PacienteDetallePage.jsx` — fotos inline en citas + tab Laboratorios

---

## 7. Consideraciones

- Los archivos subidos **no** se sincronizan con el servidor de producción automáticamente — `deploy.sh` usa rsync excluyendo `uploads/`. Los uploads en producción solo persisten si se suben directamente al servidor. (Mismo comportamiento que fotos de paciente existentes.)
- No se requiere eliminación de archivo en disco al borrar registro: registros huérfanos son aceptables en esta etapa.
- El lightbox no necesita librería externa — modal overlay con `<img>` es suficiente.
