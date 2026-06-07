# Pacientes + Expediente Clínico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el módulo de pacientes con expediente clínico completo (NOM-004-SSA3-2012), nota de evolución por cita, y búsqueda de pacientes desde el modal de citas.

**Architecture:** Opción A relacional — tablas `pacientes`, `historias_clinicas`, `notas_visita` + columna `paciente_id` en `citas`. Backend Node/Express siguiendo patrón modelo+controlador+ruta existente. Frontend React con nuevas páginas y modificación de `CitaModal`.

**Tech Stack:** Node.js + Express 5, PostgreSQL 16 (pool.query), React 19 + Vite, Tailwind CSS v4, react-router-dom v6. Sin framework de tests — verificación con curl y browser.

---

## File Map

### Nuevos — Backend
```
backend/src/db/migrations/011_pacientes.sql
backend/src/models/paciente.js
backend/src/models/historiaClinica.js
backend/src/models/notaVisita.js
backend/src/controllers/pacientesController.js
backend/src/controllers/historiasClinicasController.js
backend/src/controllers/notasVisitaController.js
backend/src/routes/pacientes.js
backend/src/routes/historias-clinicas.js
backend/src/routes/notas-visita.js
```

### Modificados — Backend
```
backend/src/index.js  — registrar 3 nuevas rutas
```

### Nuevos — Frontend
```
frontend/src/api/pacientes.js
frontend/src/api/historiasClinicas.js
frontend/src/api/notasVisita.js
frontend/src/pages/PacientesPage.jsx
frontend/src/pages/PacienteDetallePage.jsx
frontend/src/components/PacienteFormModal.jsx
frontend/src/components/PacienteMiniModal.jsx
frontend/src/components/HistoriaClinicaForm.jsx
frontend/src/components/NotaVisitaModal.jsx
```

### Modificados — Frontend
```
frontend/src/App.jsx              — rutas /pacientes y /pacientes/:id + NavItem
frontend/src/components/CitaModal.jsx  — campo paciente → autocomplete + mini modal
```

---

## Task 1: Migración — Esquema de base de datos

**Files:**
- Create: `backend/src/db/migrations/011_pacientes.sql`

- [ ] **Crear el archivo de migración**

```sql
-- backend/src/db/migrations/011_pacientes.sql

CREATE TABLE IF NOT EXISTS pacientes (
  id               SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS historias_clinicas (
  id           SERIAL PRIMARY KEY,
  paciente_id  INTEGER UNIQUE NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,

  -- Antecedentes heredofamiliares
  ah_diabetes         BOOLEAN NOT NULL DEFAULT false,
  ah_cardiopatias     BOOLEAN NOT NULL DEFAULT false,
  ah_hematologicas    BOOLEAN NOT NULL DEFAULT false,
  ah_hipertension     BOOLEAN NOT NULL DEFAULT false,
  ah_nefropatias      BOOLEAN NOT NULL DEFAULT false,
  ah_oncologicos      BOOLEAN NOT NULL DEFAULT false,
  ah_endocrinologicas BOOLEAN NOT NULL DEFAULT false,
  ah_otras            BOOLEAN NOT NULL DEFAULT false,
  ah_otras_texto      TEXT,

  -- Antecedentes personales patológicos
  -- { "diabetes_mellitus": { "tiene": true, "evolucion": "5 años" }, ... }
  app_datos           JSONB NOT NULL DEFAULT '{}',

  -- Hábitos no patológicos
  ejercicio           TEXT,
  ingesta_agua        TEXT,
  alimentacion        TEXT,
  trastornos_alim     TEXT,
  apetito             TEXT,
  antojos             TEXT,
  nivel_energia       TEXT,
  nivel_motivacion    TEXT,

  -- Gineco-obstétricos
  menarca             TEXT,
  fum                 TEXT,
  ritmo_menstrual     TEXT,
  gesta               TEXT,
  partos              TEXT,
  abortos             TEXT,
  cesareas            TEXT,
  complicaciones_emb  TEXT,
  mac                 TEXT,

  -- Rutina de piel
  piel_limpieza          TEXT,
  piel_hidratacion       TEXT,
  piel_proteccion_solar  TEXT,
  piel_rutina_noche      TEXT,
  piel_desmaquillar      TEXT,
  piel_exposicion_sol    TEXT,
  piel_retoque_protector TEXT,
  piel_tiempo_dedicado   TEXT,

  -- Motivo de consulta
  mc_envejecimiento    BOOLEAN NOT NULL DEFAULT false,
  mc_estrias           BOOLEAN NOT NULL DEFAULT false,
  mc_deshidratacion    BOOLEAN NOT NULL DEFAULT false,
  mc_adiposidad        BOOLEAN NOT NULL DEFAULT false,
  mc_hiperpigmentacion BOOLEAN NOT NULL DEFAULT false,
  mc_obesidad          BOOLEAN NOT NULL DEFAULT false,
  mc_acne              BOOLEAN NOT NULL DEFAULT false,
  mc_flacidez          BOOLEAN NOT NULL DEFAULT false,
  mc_especifique       TEXT,

  -- Tratamientos previos (arrays JSONB)
  -- [{ "tratamiento": "Toxina botulínica", "producto": "Bocouture", "fecha": "2024-01" }]
  trat_prev_faciales   JSONB NOT NULL DEFAULT '[]',
  trat_prev_corporales JSONB NOT NULL DEFAULT '[]',

  -- Exploración física
  fitzpatrick   INTEGER CHECK (fitzpatrick BETWEEN 1 AND 6),
  glogau        INTEGER CHECK (glogau BETWEEN 1 AND 4),
  tipo_rostro   TEXT,
  tipo_piel     TEXT,
  lesiones_derm TEXT,
  tipo_lesion   TEXT,
  localizacion  TEXT,

  -- Signos vitales
  sv_fc          TEXT,
  sv_fr          TEXT,
  sv_ta          TEXT,
  sv_temperatura TEXT,
  sv_saturacion  TEXT,
  sv_peso        TEXT,
  sv_talla       TEXT,
  sv_imc         TEXT,

  -- Medidas en cm
  med_cintura TEXT,
  med_cadera  TEXT,
  med_muslo   TEXT,
  med_brazo   TEXT,

  procedimiento_realizar TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notas_visita (
  id                       SERIAL PRIMARY KEY,
  cita_id                  INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  paciente_id              INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  evolucion                TEXT,
  diagnostico              TEXT,
  pronostico               TEXT,
  tratamiento_indicaciones TEXT,
  signos_vitales           JSONB NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL;
```

- [ ] **Aplicar la migración**

```bash
cd ~/elys && docker compose up -d
cd ~/elys/backend && npm run dev
# Observar en consola: "Migración aplicada: 011_pacientes.sql"
# Ctrl+C para detener
```

- [ ] **Verificar tablas creadas**

```bash
docker exec -it elys-postgres-1 psql -U elys_user -d elys -c "\dt"
# Debe mostrar: pacientes, historias_clinicas, notas_visita
# Y: SELECT column_name FROM information_schema.columns WHERE table_name='citas' AND column_name='paciente_id';
# Debe devolver 1 fila
```

- [ ] **Commit**

```bash
cd ~/elys && git add backend/src/db/migrations/011_pacientes.sql
git commit -m "feat: migración 011 — tablas pacientes, historias_clinicas, notas_visita"
```

---

## Task 2: Backend — Modelo y CRUD de Pacientes

**Files:**
- Create: `backend/src/models/paciente.js`
- Create: `backend/src/controllers/pacientesController.js`
- Create: `backend/src/routes/pacientes.js`
- Modify: `backend/src/index.js`

- [ ] **Crear el modelo**

```js
// backend/src/models/paciente.js
const pool = require('../db/pool');

const Paciente = {
  async findAll() {
    const { rows } = await pool.query(
      `SELECT id, apellido_paterno, apellido_materno, nombre, telefono, email,
              fecha_registro, created_at
       FROM pacientes ORDER BY apellido_paterno, apellido_materno, nombre`
    );
    return rows;
  },

  async buscar(q) {
    const term = `%${q}%`;
    const { rows } = await pool.query(
      `SELECT id, apellido_paterno, apellido_materno, nombre, telefono
       FROM pacientes
       WHERE apellido_paterno ILIKE $1 OR apellido_materno ILIKE $1
          OR nombre ILIKE $1 OR telefono ILIKE $1
       ORDER BY apellido_paterno, nombre LIMIT 10`,
      [term]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT p.*,
              json_agg(DISTINCT jsonb_build_object(
                'id', c.id, 'fecha_hora', c.fecha_hora, 'estatus', c.estatus,
                'tratamiento_nombre', t.nombre, 'empleada_nombre', e.nombre
              ) ORDER BY c.fecha_hora DESC) FILTER (WHERE c.id IS NOT NULL) AS citas,
              json_agg(DISTINCT jsonb_build_object(
                'id', nv.id, 'cita_id', nv.cita_id, 'evolucion', nv.evolucion,
                'diagnostico', nv.diagnostico, 'created_at', nv.created_at
              ) ORDER BY nv.created_at DESC) FILTER (WHERE nv.id IS NOT NULL) AS notas
       FROM pacientes p
       LEFT JOIN citas c ON c.paciente_id = p.id
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN empleados e ON e.id = c.empleada_id
       LEFT JOIN notas_visita nv ON nv.paciente_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    return rows[0];
  },

  async create(data) {
    const { apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
            edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, created_by } = data;
    const { rows } = await pool.query(
      `INSERT INTO pacientes
         (apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
          edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
       edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, created_by]
    );
    return rows[0];
  },

  async update(id, data) {
    const { apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
            edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones } = data;
    const { rows } = await pool.query(
      `UPDATE pacientes SET
         apellido_paterno = COALESCE($1, apellido_paterno),
         apellido_materno = COALESCE($2, apellido_materno),
         nombre           = COALESCE($3, nombre),
         fecha_registro   = COALESCE($4, fecha_registro),
         fecha_nacimiento = COALESCE($5, fecha_nacimiento),
         edad             = COALESCE($6, edad),
         sexo             = COALESCE($7, sexo),
         ocupacion        = COALESCE($8, ocupacion),
         estado_civil     = COALESCE($9, estado_civil),
         telefono         = COALESCE($10, telefono),
         email            = COALESCE($11, email),
         direccion        = COALESCE($12, direccion),
         anotaciones      = COALESCE($13, anotaciones),
         updated_at       = NOW()
       WHERE id = $14 RETURNING *`,
      [apellido_paterno, apellido_materno, nombre, fecha_registro, fecha_nacimiento,
       edad, sexo, ocupacion, estado_civil, telefono, email, direccion, anotaciones, id]
    );
    return rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM pacientes WHERE id = $1', [id]);
  },
};

module.exports = Paciente;
```

- [ ] **Crear el controlador**

```js
// backend/src/controllers/pacientesController.js
const Paciente = require('../models/paciente');
const pool = require('../db/pool');

exports.list = async (req, res, next) => {
  try {
    const pacientes = await Paciente.findAll();
    res.json(pacientes);
  } catch (err) { next(err); }
};

exports.buscar = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const resultados = await Paciente.buscar(q);
    res.json(resultados);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { apellido_paterno, nombre } = req.body;
    if (!apellido_paterno || !nombre) {
      return res.status(400).json({ error: 'apellido_paterno y nombre son requeridos' });
    }
    const paciente = await Paciente.create({ ...req.body, created_by: req.user.id });
    // Crear historia clínica vacía
    await pool.query(
      'INSERT INTO historias_clinicas (paciente_id, created_by) VALUES ($1, $2)',
      [paciente.id, req.user.id]
    );
    res.status(201).json(paciente);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const paciente = await Paciente.update(req.params.id, req.body);
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admin puede eliminar pacientes' });
    }
    await Paciente.delete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
```

- [ ] **Crear la ruta**

```js
// backend/src/routes/pacientes.js
const router = require('express').Router();
const ctrl = require('../controllers/pacientesController');

router.get('/buscar', ctrl.buscar);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
```

- [ ] **Registrar la ruta en index.js** — agregar después de la línea de tratamientos:

```js
app.use('/api/pacientes', authMiddleware, require('./routes/pacientes'));
```

- [ ] **Verificar con curl**

```bash
# Primero obtener token
TOKEN=$(curl -s -X POST http://localhost:3008/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elys.com","password":"Admin123!"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Crear paciente
curl -s -X POST http://localhost:3008/api/pacientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"apellido_paterno":"García","apellido_materno":"López","nombre":"María","telefono":"4521234567"}' | jq .
# Debe devolver el paciente con id y created_at

# Buscar
curl -s "http://localhost:3008/api/pacientes/buscar?q=gar" \
  -H "Authorization: Bearer $TOKEN" | jq .
# Debe devolver array con "García López María"
```

- [ ] **Commit**

```bash
cd ~/elys && git add backend/src/models/paciente.js backend/src/controllers/pacientesController.js \
  backend/src/routes/pacientes.js backend/src/index.js
git commit -m "feat: CRUD de pacientes con búsqueda y creación de historia vacía"
```

---

## Task 3: Backend — Historias Clínicas

**Files:**
- Create: `backend/src/models/historiaClinica.js`
- Create: `backend/src/controllers/historiasClinicasController.js`
- Create: `backend/src/routes/historias-clinicas.js`
- Modify: `backend/src/index.js`

- [ ] **Crear el modelo**

```js
// backend/src/models/historiaClinica.js
const pool = require('../db/pool');

const HistoriaClinica = {
  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      'SELECT * FROM historias_clinicas WHERE paciente_id = $1',
      [pacienteId]
    );
    return rows[0] || null;
  },

  async upsert(pacienteId, data, userId) {
    // Construir SET dinámico con todos los campos posibles
    const campos = [
      'ah_diabetes','ah_cardiopatias','ah_hematologicas','ah_hipertension',
      'ah_nefropatias','ah_oncologicos','ah_endocrinologicas','ah_otras','ah_otras_texto',
      'app_datos',
      'ejercicio','ingesta_agua','alimentacion','trastornos_alim','apetito',
      'antojos','nivel_energia','nivel_motivacion',
      'menarca','fum','ritmo_menstrual','gesta','partos','abortos','cesareas',
      'complicaciones_emb','mac',
      'piel_limpieza','piel_hidratacion','piel_proteccion_solar','piel_rutina_noche',
      'piel_desmaquillar','piel_exposicion_sol','piel_retoque_protector','piel_tiempo_dedicado',
      'mc_envejecimiento','mc_estrias','mc_deshidratacion','mc_adiposidad',
      'mc_hiperpigmentacion','mc_obesidad','mc_acne','mc_flacidez','mc_especifique',
      'trat_prev_faciales','trat_prev_corporales',
      'fitzpatrick','glogau','tipo_rostro','tipo_piel','lesiones_derm','tipo_lesion','localizacion',
      'sv_fc','sv_fr','sv_ta','sv_temperatura','sv_saturacion','sv_peso','sv_talla','sv_imc',
      'med_cintura','med_cadera','med_muslo','med_brazo',
      'procedimiento_realizar'
    ];

    const valores = [];
    const sets = [];
    let i = 1;
    for (const campo of campos) {
      if (data[campo] !== undefined) {
        sets.push(`${campo} = $${i}`);
        valores.push(data[campo]);
        i++;
      }
    }
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      // Solo updated_at — nada que guardar
      const { rows } = await pool.query(
        'SELECT * FROM historias_clinicas WHERE paciente_id = $1', [pacienteId]
      );
      return rows[0];
    }

    valores.push(pacienteId);
    const { rows } = await pool.query(
      `UPDATE historias_clinicas SET ${sets.join(', ')} WHERE paciente_id = $${i} RETURNING *`,
      valores
    );
    return rows[0];
  },
};

module.exports = HistoriaClinica;
```

- [ ] **Crear el controlador**

```js
// backend/src/controllers/historiasClinicasController.js
const HistoriaClinica = require('../models/historiaClinica');

exports.get = async (req, res, next) => {
  try {
    const historia = await HistoriaClinica.findByPaciente(req.params.pacienteId);
    if (!historia) return res.status(404).json({ error: 'Historia clínica no encontrada' });
    res.json(historia);
  } catch (err) { next(err); }
};

exports.save = async (req, res, next) => {
  try {
    const historia = await HistoriaClinica.upsert(
      req.params.pacienteId, req.body, req.user.id
    );
    res.json(historia);
  } catch (err) { next(err); }
};
```

- [ ] **Crear la ruta**

```js
// backend/src/routes/historias-clinicas.js
const router = require('express').Router();
const ctrl = require('../controllers/historiasClinicasController');

router.get('/:pacienteId', ctrl.get);
router.put('/:pacienteId', ctrl.save);

module.exports = router;
```

- [ ] **Registrar en index.js** — agregar después de pacientes:

```js
app.use('/api/historias-clinicas', authMiddleware, require('./routes/historias-clinicas'));
```

- [ ] **Verificar con curl**

```bash
# Usar el id del paciente creado en Task 2 (asumiendo id=1)
TOKEN=$(curl -s -X POST http://localhost:3008/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elys.com","password":"Admin123!"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Leer historia vacía
curl -s http://localhost:3008/api/historias-clinicas/1 \
  -H "Authorization: Bearer $TOKEN" | jq .id,.paciente_id
# Debe mostrar id y paciente_id=1

# Guardar datos
curl -s -X PUT http://localhost:3008/api/historias-clinicas/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ah_diabetes":true,"mc_acne":true,"app_datos":{"alergicos":{"tiene":true,"evolucion":"Penicilina"}}}' | jq .ah_diabetes,.mc_acne
# Debe mostrar: true, true
```

- [ ] **Commit**

```bash
cd ~/elys && git add backend/src/models/historiaClinica.js \
  backend/src/controllers/historiasClinicasController.js \
  backend/src/routes/historias-clinicas.js backend/src/index.js
git commit -m "feat: CRUD de historia clínica por paciente"
```

---

## Task 4: Backend — Notas de Visita

**Files:**
- Create: `backend/src/models/notaVisita.js`
- Create: `backend/src/controllers/notasVisitaController.js`
- Create: `backend/src/routes/notas-visita.js`
- Modify: `backend/src/index.js`

- [ ] **Crear el modelo**

```js
// backend/src/models/notaVisita.js
const pool = require('../db/pool');

const NotaVisita = {
  async findByCita(citaId) {
    const { rows } = await pool.query(
      'SELECT * FROM notas_visita WHERE cita_id = $1', [citaId]
    );
    return rows[0] || null;
  },

  async findByPaciente(pacienteId) {
    const { rows } = await pool.query(
      `SELECT nv.*, c.fecha_hora, c.estatus AS cita_estatus,
              t.nombre AS tratamiento_nombre, u.nombre AS creado_por_nombre
       FROM notas_visita nv
       JOIN citas c ON c.id = nv.cita_id
       LEFT JOIN tratamientos t ON t.id = c.tratamiento_id
       LEFT JOIN usuarios u ON u.id = nv.created_by
       WHERE nv.paciente_id = $1
       ORDER BY nv.created_at DESC`,
      [pacienteId]
    );
    return rows;
  },

  async create(data) {
    const { cita_id, paciente_id, evolucion, diagnostico, pronostico,
            tratamiento_indicaciones, signos_vitales, created_by } = data;
    const { rows } = await pool.query(
      `INSERT INTO notas_visita
         (cita_id, paciente_id, evolucion, diagnostico, pronostico,
          tratamiento_indicaciones, signos_vitales, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cita_id, paciente_id, evolucion, diagnostico, pronostico,
       tratamiento_indicaciones, signos_vitales || {}, created_by]
    );
    return rows[0];
  },

  async update(id, data) {
    const { evolucion, diagnostico, pronostico, tratamiento_indicaciones, signos_vitales } = data;
    const { rows } = await pool.query(
      `UPDATE notas_visita SET
         evolucion                = COALESCE($1, evolucion),
         diagnostico              = COALESCE($2, diagnostico),
         pronostico               = COALESCE($3, pronostico),
         tratamiento_indicaciones = COALESCE($4, tratamiento_indicaciones),
         signos_vitales           = COALESCE($5, signos_vitales)
       WHERE id = $6 RETURNING *`,
      [evolucion, diagnostico, pronostico, tratamiento_indicaciones, signos_vitales, id]
    );
    return rows[0];
  },
};

module.exports = NotaVisita;
```

- [ ] **Crear el controlador**

```js
// backend/src/controllers/notasVisitaController.js
const NotaVisita = require('../models/notaVisita');

exports.getByCita = async (req, res, next) => {
  try {
    const nota = await NotaVisita.findByCita(req.query.cita_id);
    res.json(nota || null);
  } catch (err) { next(err); }
};

exports.getByPaciente = async (req, res, next) => {
  try {
    const notas = await NotaVisita.findByPaciente(req.params.pacienteId);
    res.json(notas);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { cita_id, paciente_id } = req.body;
    if (!cita_id || !paciente_id) {
      return res.status(400).json({ error: 'cita_id y paciente_id son requeridos' });
    }
    const nota = await NotaVisita.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(nota);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const nota = await NotaVisita.update(req.params.id, req.body);
    res.json(nota);
  } catch (err) { next(err); }
};
```

- [ ] **Crear la ruta**

```js
// backend/src/routes/notas-visita.js
const router = require('express').Router();
const ctrl = require('../controllers/notasVisitaController');

router.get('/paciente/:pacienteId', ctrl.getByPaciente);
router.get('/', ctrl.getByCita);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
```

- [ ] **Registrar en index.js** — agregar después de historias-clinicas:

```js
app.use('/api/notas-visita', authMiddleware, require('./routes/notas-visita'));
```

- [ ] **Commit**

```bash
cd ~/elys && git add backend/src/models/notaVisita.js \
  backend/src/controllers/notasVisitaController.js \
  backend/src/routes/notas-visita.js backend/src/index.js
git commit -m "feat: CRUD de notas de visita (nota de evolución NOM)"
```

---

## Task 5: Frontend — Clientes API

**Files:**
- Create: `frontend/src/api/pacientes.js`
- Create: `frontend/src/api/historiasClinicas.js`
- Create: `frontend/src/api/notasVisita.js`

- [ ] **Crear api/pacientes.js**

```js
// frontend/src/api/pacientes.js
import api from './client';

export const getPacientes = () => api.get('/pacientes').then(r => r.data);
export const buscarPacientes = (q) => api.get('/pacientes/buscar', { params: { q } }).then(r => r.data);
export const getPaciente = (id) => api.get(`/pacientes/${id}`).then(r => r.data);
export const createPaciente = (data) => api.post('/pacientes', data).then(r => r.data);
export const updatePaciente = (id, data) => api.put(`/pacientes/${id}`, data).then(r => r.data);
export const deletePaciente = (id) => api.delete(`/pacientes/${id}`).then(r => r.data);
```

- [ ] **Crear api/historiasClinicas.js**

```js
// frontend/src/api/historiasClinicas.js
import api from './client';

export const getHistoria = (pacienteId) =>
  api.get(`/historias-clinicas/${pacienteId}`).then(r => r.data);

export const saveHistoria = (pacienteId, data) =>
  api.put(`/historias-clinicas/${pacienteId}`, data).then(r => r.data);
```

- [ ] **Crear api/notasVisita.js**

```js
// frontend/src/api/notasVisita.js
import api from './client';

export const getNotasByCita = (citaId) =>
  api.get('/notas-visita', { params: { cita_id: citaId } }).then(r => r.data);

export const getNotasByPaciente = (pacienteId) =>
  api.get(`/notas-visita/paciente/${pacienteId}`).then(r => r.data);

export const createNota = (data) => api.post('/notas-visita', data).then(r => r.data);
export const updateNota = (id, data) => api.put(`/notas-visita/${id}`, data).then(r => r.data);
```

- [ ] **Commit**

```bash
cd ~/elys && git add frontend/src/api/pacientes.js frontend/src/api/historiasClinicas.js \
  frontend/src/api/notasVisita.js
git commit -m "feat: API clients para pacientes, historias y notas de visita"
```

---

## Task 6: Frontend — PacientesPage + PacienteFormModal

**Files:**
- Create: `frontend/src/pages/PacientesPage.jsx`
- Create: `frontend/src/components/PacienteFormModal.jsx`

- [ ] **Crear PacienteFormModal.jsx**

```jsx
// frontend/src/components/PacienteFormModal.jsx
import { useState, useEffect } from 'react';
import { createPaciente, updatePaciente } from '../api/pacientes';

const EMPTY = {
  apellido_paterno: '', apellido_materno: '', nombre: '',
  fecha_registro: new Date().toISOString().split('T')[0],
  fecha_nacimiento: '', edad: '', sexo: '', ocupacion: '',
  estado_civil: '', telefono: '', email: '', direccion: '', anotaciones: '',
};

export default function PacienteFormModal({ paciente, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paciente) setForm({ ...EMPTY, ...paciente });
    else setForm(EMPTY);
  }, [paciente]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const saved = paciente
        ? await updatePaciente(paciente.id, form)
        : await createPaciente(form);
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-dark)' }}>
            {paciente ? 'Editar paciente' : 'Nueva paciente'}
          </h2>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            {[
              ['apellido_paterno', 'Apellido paterno *', true],
              ['apellido_materno', 'Apellido materno', false],
              ['nombre', 'Nombre(s) *', true],
              ['telefono', 'Teléfono', false],
              ['email', 'Email', false],
              ['ocupacion', 'Ocupación', false],
            ].map(([key, label, required]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="text" required={required} value={form[key]}
                       onChange={e => set(key, e.target.value)}
                       className="w-full border rounded-lg px-3 py-2 text-sm"
                       style={{ borderColor: 'var(--color-primary)' }} />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sexo</label>
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>
                <option value="">— Seleccionar —</option>
                <option>Femenino</option><option>Masculino</option><option>Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado civil</label>
              <select value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-primary)' }}>
                <option value="">— Seleccionar —</option>
                <option>Soltera</option><option>Casada</option><option>Divorciada</option>
                <option>Viuda</option><option>Unión libre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de nacimiento</label>
              <input type="date" value={form.fecha_nacimiento}
                     onChange={e => set('fecha_nacimiento', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Edad</label>
              <input type="number" min="0" max="120" value={form.edad}
                     onChange={e => set('edad', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
              <input type="text" value={form.direccion}
                     onChange={e => set('direccion', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Anotaciones</label>
              <textarea rows={2} value={form.anotaciones}
                        onChange={e => set('anotaciones', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--color-primary)' }} />
            </div>

            <div className="col-span-2 flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Crear PacientesPage.jsx**

```jsx
// frontend/src/pages/PacientesPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes } from '../api/pacientes';
import PacienteFormModal from '../components/PacienteFormModal';

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const cargar = () => {
    setLoading(true);
    getPacientes().then(setPacientes).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = pacientes.filter(p => {
    const q = busqueda.toLowerCase();
    return (
      p.apellido_paterno?.toLowerCase().includes(q) ||
      p.apellido_materno?.toLowerCase().includes(q) ||
      p.nombre?.toLowerCase().includes(q) ||
      p.telefono?.includes(q)
    );
  });

  function nombreCompleto(p) {
    return [p.apellido_paterno, p.apellido_materno, p.nombre].filter(Boolean).join(' ');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>Pacientes</h1>
        <button onClick={() => setModal(true)}
                className="px-4 py-2 text-sm text-white rounded-lg"
                style={{ backgroundColor: 'var(--color-accent)' }}>
          + Nueva paciente
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nombre o teléfono…"
               value={busqueda} onChange={e => setBusqueda(e.target.value)}
               className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm"
               style={{ borderColor: 'var(--color-primary)' }} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
             style={{ borderColor: 'var(--color-sage)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                {['Nombre completo', 'Teléfono', 'Registro', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'var(--color-dark)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
              ) : filtrados.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 cursor-pointer"
                    style={{ borderColor: 'var(--color-sage)' }}
                    onClick={() => navigate(`/pacientes/${p.id}`)}>
                  <td className="px-4 py-3 font-medium">{nombreCompleto(p)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.telefono || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.fecha_registro ? new Date(p.fecha_registro).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>Ver expediente →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <PacienteFormModal
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); cargar(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
cd ~/elys && git add frontend/src/pages/PacientesPage.jsx \
  frontend/src/components/PacienteFormModal.jsx
git commit -m "feat: PacientesPage con listado, búsqueda y modal de registro"
```

---

## Task 7: Frontend — HistoriaClinicaForm

**Files:**
- Create: `frontend/src/components/HistoriaClinicaForm.jsx`

Este es el formulario en acordeón con 7 secciones basado en el PDF oficial de Gioval.

- [ ] **Crear HistoriaClinicaForm.jsx**

```jsx
// frontend/src/components/HistoriaClinicaForm.jsx
import { useState } from 'react';
import { saveHistoria } from '../api/historiasClinicas';

const APP_KEYS = [
  { key: 'diabetes_mellitus', label: 'Diabetes Mellitus' },
  { key: 'hipertension_arterial', label: 'Hipertensión arterial' },
  { key: 'alergicos', label: 'Alérgicos' },
  { key: 'transfusiones', label: 'Transfusiones sanguíneas' },
  { key: 'traumatismos', label: 'Traumatismos' },
  { key: 'hospitalizaciones', label: 'Hospitalizaciones previas' },
  { key: 'quirurgicos', label: 'Quirúrgicos' },
  { key: 'lesiones_dermatologicas', label: 'Lesiones dermatológicas' },
  { key: 'enf_endocrinas', label: 'Enf. Endócrinas' },
  { key: 'enf_psiquiatricas', label: 'Enf. Psiquiátricas' },
  { key: 'epilepsia', label: 'Epilepsia' },
  { key: 'adicciones', label: 'Adicciones' },
];

const TRAT_FACIALES = [
  'Toxina botulínica','Rellenos faciales con AH','Hilos de sustentación',
  'Peeling','Microdermoabrasión','Plasma rico en plaquetas',
  'Intradermoterapia','Micropigmentación','Radiofrecuencia','Otros',
];
const TRAT_CORPORALES = [
  'Ultra cavitación','Radiofrecuencia','Gimnasia pasiva','Carboxiterapia',
  'Intradermoterapia','Hidrolipoclasia','Crió lipólisis','Otras',
];

const FITZPATRICK = [
  { num: 1, label: 'I', desc: 'Muy blanca/rosada', color: '#FDDBB4' },
  { num: 2, label: 'II', desc: 'Clara, sensible', color: '#F5C18B' },
  { num: 3, label: 'III', desc: 'Clara/bronceada en verano', color: '#E8A96A' },
  { num: 4, label: 'IV', desc: 'De oscura a morena', color: '#C47F45' },
  { num: 5, label: 'V', desc: 'De oscura a morena', color: '#9B5E2A' },
  { num: 6, label: 'VI', desc: 'Muy oscura', color: '#5C3010' },
];

const GLOGAU = [
  { num: 1, label: 'Tipo 1', desc: 'Sin arrugas · 20-30 años · inicio de fotoenvejecimiento' },
  { num: 2, label: 'Tipo 2', desc: 'Arrugas de expresión · 30-40 años · lentigos solares' },
  { num: 3, label: 'Tipo 3', desc: 'Arrugas en reposo · 40-60 años · manchas evidentes' },
  { num: 4, label: 'Tipo 4', desc: 'Solo arrugas · +60 años · fotoenvejecimiento severo' },
];

function Section({ title, open, onToggle, children }) {
  return (
    <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: 'var(--color-sage)' }}>
      <button type="button" onClick={onToggle}
              className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm"
              style={{ backgroundColor: open ? 'var(--color-primary)' : 'white', color: 'var(--color-dark)' }}>
        <span>{title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, ...props }) {
  return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
           className="w-full border rounded-lg px-3 py-2 text-sm"
           style={{ borderColor: 'var(--color-primary)' }} {...props} />
  );
}

function TextArea({ value, onChange, rows = 2 }) {
  return (
    <textarea rows={rows} value={value || ''}
              onChange={e => onChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-primary)' }} />
  );
}

export default function HistoriaClinicaForm({ pacienteId, historia: initial, onSaved }) {
  const [h, setH] = useState(initial || {});
  const [open, setOpen] = useState({ 1: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const set = (k, v) => setH(prev => ({ ...prev, [k]: v }));
  const toggle = (n) => setOpen(prev => ({ ...prev, [n]: !prev[n] }));

  // app_datos helpers
  const getApp = (key) => h.app_datos?.[key] || { tiene: false, evolucion: '' };
  const setApp = (key, field, val) => {
    const prev = getApp(key);
    set('app_datos', { ...h.app_datos, [key]: { ...prev, [field]: val } });
  };

  // Tratamientos previos helpers
  const getTratPrev = (tipo) => h[tipo] || TRAT_FACIALES.map(t => ({ tratamiento: t, producto: '', fecha: '' }));
  const setTratPrev = (tipo, idx, field, val) => {
    const arr = [...(h[tipo] || [])];
    arr[idx] = { ...arr[idx], [field]: val };
    set(tipo, arr);
  };
  const initTratPrev = (tipo, names) => {
    if (!h[tipo] || h[tipo].length === 0) {
      set(tipo, names.map(t => ({ tratamiento: t, producto: '', fecha: '' })));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setOk(false);
    try {
      const saved = await saveHistoria(pacienteId, h);
      setH(saved);
      setOk(true);
      if (onSaved) onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm";
  const borderStyle = { borderColor: 'var(--color-primary)' };

  return (
    <form onSubmit={handleSubmit}>
      {/* Sección 1 — Antecedentes heredofamiliares */}
      <Section title="1. Antecedentes Heredofamiliares" open={!!open[1]} onToggle={() => toggle(1)}>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['ah_diabetes','Diabetes Mellitus'], ['ah_cardiopatias','Cardiopatías'],
            ['ah_hematologicas','Ef. Hematológicas'], ['ah_hipertension','Hipertensión'],
            ['ah_nefropatias','Nefropatías'], ['ah_oncologicos','Onológicos'],
            ['ah_endocrinologicas','Enf. Endocrinológicas'], ['ah_otras','Otras'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!h[k]}
                     onChange={e => set(k, e.target.checked)}
                     className="accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
        {h.ah_otras && (
          <div className="mt-3">
            <Field label="Especificar otras">
              <TextInput value={h.ah_otras_texto} onChange={v => set('ah_otras_texto', v)} />
            </Field>
          </div>
        )}
      </Section>

      {/* Sección 2 — Antecedentes personales patológicos */}
      <Section title="2. Antecedentes Personales Patológicos" open={!!open[2]} onToggle={() => toggle(2)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                <th className="text-left px-3 py-2 font-medium text-xs" style={{ color: 'var(--color-dark)' }}>Patología</th>
                <th className="px-3 py-2 text-xs font-medium w-12" style={{ color: 'var(--color-dark)' }}>Sí</th>
                <th className="px-3 py-2 text-xs font-medium w-12" style={{ color: 'var(--color-dark)' }}>No</th>
                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-dark)' }}>Tiempo de evolución / Tx actual</th>
              </tr>
            </thead>
            <tbody>
              {APP_KEYS.map(({ key, label }, i) => {
                const val = getApp(key);
                return (
                  <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-medium">{label}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="radio" name={key} checked={val.tiene === true}
                             onChange={() => setApp(key, 'tiene', true)}
                             className="accent-[var(--color-accent)]" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="radio" name={key} checked={val.tiene === false || val.tiene === undefined}
                             onChange={() => setApp(key, 'tiene', false)}
                             className="accent-[var(--color-accent)]" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={val.evolucion || ''}
                             onChange={e => setApp(key, 'evolucion', e.target.value)}
                             disabled={!val.tiene}
                             placeholder={val.tiene ? 'Ej. 5 años, en control con metformina' : ''}
                             className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-400`}
                             style={borderStyle} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Sección 3 — Hábitos y estilo de vida */}
      <Section title="3. Hábitos y Estilo de Vida" open={!!open[3]} onToggle={() => toggle(3)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ejercicio (tipo, duración y frecuencia)">
            <TextInput value={h.ejercicio} onChange={v => set('ejercicio', v)} />
          </Field>
          <Field label="Ingesta de agua">
            <TextInput value={h.ingesta_agua} onChange={v => set('ingesta_agua', v)} />
          </Field>
          <div className="col-span-2">
            <Field label="Alimentación — describir un día normal">
              <TextArea value={h.alimentacion} onChange={v => set('alimentacion', v)} rows={3} />
            </Field>
          </div>
          <Field label="Trastornos de alimentación">
            <TextInput value={h.trastornos_alim} onChange={v => set('trastornos_alim', v)} />
          </Field>
          <Field label="Apetito">
            <TextInput value={h.apetito} onChange={v => set('apetito', v)} />
          </Field>
          <Field label="Antojos">
            <TextInput value={h.antojos} onChange={v => set('antojos', v)} />
          </Field>
          <Field label="Nivel de energía">
            <TextInput value={h.nivel_energia} onChange={v => set('nivel_energia', v)} />
          </Field>
          <div className="col-span-2">
            <Field label="Nivel de motivación">
              <TextInput value={h.nivel_motivacion} onChange={v => set('nivel_motivacion', v)} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Sección 4 — Gineco-obstétricos + Rutina de piel */}
      <Section title="4. Gineco-Obstétricos y Rutina de Piel" open={!!open[4]} onToggle={() => toggle(4)}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-accent)' }}>
          Antecedentes Gineco-Obstétricos
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            ['menarca','Menarca'], ['fum','FUM'], ['ritmo_menstrual','Ritmo menstrual'],
            ['gesta','G'], ['partos','P'], ['abortos','A'], ['cesareas','C'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
          <div className="col-span-3">
            <Field label="Complicaciones en los embarazos">
              <TextInput value={h.complicaciones_emb} onChange={v => set('complicaciones_emb', v)} />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="MAC (método anticonceptivo)">
              <TextInput value={h.mac} onChange={v => set('mac', v)} />
            </Field>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-accent)' }}>
          Rutina de Cuidado de la Piel
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['piel_limpieza','Limpieza'], ['piel_hidratacion','Hidratación'],
            ['piel_proteccion_solar','Protección solar'], ['piel_rutina_noche','Rutina de noche'],
            ['piel_desmaquillar','Frecuencia de desmaquillar y lavar'],
            ['piel_exposicion_sol','Exposición al sol/contaminación'],
            ['piel_retoque_protector','Retoque de protector solar'],
            ['piel_tiempo_dedicado','Tiempo dedicado al cuidado de piel'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
        </div>
      </Section>

      {/* Sección 5 — Motivo de consulta */}
      <Section title="5. Motivo de Consulta" open={!!open[5]} onToggle={() => toggle(5)}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            ['mc_envejecimiento','Envejecimiento cutáneo'], ['mc_estrias','Estrías'],
            ['mc_deshidratacion','Desidratación'], ['mc_adiposidad','Adiposidad localizada'],
            ['mc_hiperpigmentacion','Hiperpigmentación'], ['mc_obesidad','Obesidad'],
            ['mc_acne','Acné'], ['mc_flacidez','Flacidez'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!h[k]}
                     onChange={e => set(k, e.target.checked)}
                     className="accent-[var(--color-accent)]" />
              {label}
            </label>
          ))}
        </div>
        <Field label="Especifique">
          <TextInput value={h.mc_especifique} onChange={v => set('mc_especifique', v)} />
        </Field>
      </Section>

      {/* Sección 6 — Tratamientos previos */}
      <Section title="6. Tratamientos Previos" open={!!open[6]} onToggle={() => {
        toggle(6);
        if (!open[6]) {
          initTratPrev('trat_prev_faciales', TRAT_FACIALES);
          initTratPrev('trat_prev_corporales', TRAT_CORPORALES);
        }
      }}>
        {['trat_prev_faciales', 'trat_prev_corporales'].map((tipo, ti) => {
          const names = ti === 0 ? TRAT_FACIALES : TRAT_CORPORALES;
          const rows = h[tipo]?.length > 0 ? h[tipo] : names.map(t => ({ tratamiento: t, producto: '', fecha: '' }));
          return (
            <div key={tipo} className={ti === 1 ? 'mt-6' : ''}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                {ti === 0 ? 'Faciales' : 'Corporales'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                      {['Sustancia/Procedimiento','Producto/Marca','Fecha de aplicación'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-dark)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 font-medium text-xs">{row.tratamiento}</td>
                        <td className="px-3 py-2">
                          <input type="text" value={row.producto || ''}
                                 onChange={e => setTratPrev(tipo, idx, 'producto', e.target.value)}
                                 className={inputCls} style={borderStyle} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={row.fecha || ''} placeholder="ej. 2024-03"
                                 onChange={e => setTratPrev(tipo, idx, 'fecha', e.target.value)}
                                 className={inputCls} style={borderStyle} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </Section>

      {/* Sección 7 — Exploración física */}
      <Section title="7. Exploración Física" open={!!open[7]} onToggle={() => toggle(7)}>
        {/* Fitzpatrick */}
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Fototipo Fitzpatrick
        </p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {FITZPATRICK.map(f => (
            <button key={f.num} type="button"
                    onClick={() => set('fitzpatrick', f.num)}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 text-xs transition-all w-20 ${h.fitzpatrick === f.num ? 'border-[var(--color-accent)] shadow-md' : 'border-gray-200'}`}>
              <div className="w-8 h-8 rounded-full mb-1 border border-gray-300"
                   style={{ backgroundColor: f.color }} />
              <span className="font-bold">{f.label}</span>
              <span className="text-gray-500 text-center leading-tight" style={{ fontSize: '10px' }}>{f.desc}</span>
            </button>
          ))}
        </div>

        {/* Glogau */}
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Clasificación Glogau
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {GLOGAU.map(g => (
            <label key={g.num} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-xs transition-all ${h.glogau === g.num ? 'border-[var(--color-accent)] bg-[var(--color-primary)]' : 'border-gray-200'}`}>
              <input type="radio" name="glogau" checked={h.glogau === g.num}
                     onChange={() => set('glogau', g.num)}
                     className="mt-0.5 accent-[var(--color-accent)]" />
              <div><span className="font-bold block">{g.label}</span>{g.desc}</div>
            </label>
          ))}
        </div>

        {/* Tipo de piel / rostro */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ['tipo_rostro','Tipo de rostro'], ['tipo_piel','Tipo de piel'],
            ['lesiones_derm','Lesiones dermatológicas'], ['tipo_lesion','Tipo de lesión'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
          <div className="col-span-2">
            <Field label="Localización">
              <TextInput value={h.localizacion} onChange={v => set('localizacion', v)} />
            </Field>
          </div>
        </div>

        {/* Signos vitales */}
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Signos Vitales
        </p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            ['sv_fc','FC'], ['sv_fr','FR'], ['sv_ta','TA'], ['sv_temperatura','Temp.'],
            ['sv_saturacion','Saturación'], ['sv_peso','Peso'], ['sv_talla','Talla'], ['sv_imc','IMC'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
        </div>

        {/* Medidas */}
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
          Medidas en CM
        </p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[['med_cintura','Cintura'], ['med_cadera','Cadera'], ['med_muslo','Muslo'], ['med_brazo','Brazo']].map(([k, label]) => (
            <Field key={k} label={label}>
              <TextInput value={h[k]} onChange={v => set(k, v)} />
            </Field>
          ))}
        </div>

        {/* Procedimiento */}
        <Field label="Procedimiento a realizar">
          <TextArea value={h.procedimiento_realizar} onChange={v => set('procedimiento_realizar', v)} rows={3} />
        </Field>
      </Section>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      {ok && <p className="text-green-600 text-sm mt-2">Historia clínica guardada correctamente.</p>}

      <div className="flex justify-end mt-4">
        <button type="submit" disabled={loading}
                className="px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}>
          {loading ? 'Guardando...' : 'Guardar historia clínica'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Commit**

```bash
cd ~/elys && git add frontend/src/components/HistoriaClinicaForm.jsx
git commit -m "feat: formulario historia clínica completo (7 secciones, NOM-004)"
```

---

## Task 8: Frontend — NotaVisitaModal

**Files:**
- Create: `frontend/src/components/NotaVisitaModal.jsx`

- [ ] **Crear NotaVisitaModal.jsx**

```jsx
// frontend/src/components/NotaVisitaModal.jsx
import { useState, useEffect } from 'react';
import { createNota, updateNota } from '../api/notasVisita';

const EMPTY_SV = { fc: '', fr: '', ta: '', temperatura: '', saturacion: '', peso: '', talla: '' };

export default function NotaVisitaModal({ cita, pacienteId, nota, onClose, onSaved }) {
  const [form, setForm] = useState({
    evolucion: '', diagnostico: '', pronostico: '',
    tratamiento_indicaciones: '', signos_vitales: EMPTY_SV,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (nota) {
      setForm({
        evolucion: nota.evolucion || '',
        diagnostico: nota.diagnostico || '',
        pronostico: nota.pronostico || '',
        tratamiento_indicaciones: nota.tratamiento_indicaciones || '',
        signos_vitales: nota.signos_vitales || EMPTY_SV,
      });
    }
  }, [nota]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSV = (k, v) => setForm(f => ({ ...f, signos_vitales: { ...f.signos_vitales, [k]: v } }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const saved = nota
        ? await updateNota(nota.id, form)
        : await createNota({ ...form, cita_id: cita.id, paciente_id: pacienteId });
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setLoading(false); }
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm";
  const borderStyle = { borderColor: 'var(--color-primary)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-dark)' }}>
            Nota de Evolución
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Cita: {cita ? new Date(cita.fecha_hora).toLocaleString('es-MX') : ''} · {cita?.tratamiento_nombre || ''}
          </p>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              ['evolucion', 'Evolución clínica', 4],
              ['diagnostico', 'Diagnóstico', 2],
              ['pronostico', 'Pronóstico', 2],
              ['tratamiento_indicaciones', 'Tratamiento e indicaciones (dosis, vía, periodicidad)', 3],
            ].map(([k, label, rows]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <textarea rows={rows} value={form[k]}
                          onChange={e => set(k, e.target.value)}
                          className={inputCls} style={borderStyle} />
              </div>
            ))}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-accent)' }}>
                Signos Vitales (opcional)
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[['fc','FC'], ['fr','FR'], ['ta','TA'], ['temperatura','Temp.'],
                  ['saturacion','Sat.'], ['peso','Peso'], ['talla','Talla']].map(([k, label]) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type="text" value={form.signos_vitales[k] || ''}
                           onChange={e => setSV(k, e.target.value)}
                           className={inputCls} style={borderStyle} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
cd ~/elys && git add frontend/src/components/NotaVisitaModal.jsx
git commit -m "feat: modal de nota de evolución (nota de visita NOM)"
```

---

## Task 9: Frontend — PacienteDetallePage

**Files:**
- Create: `frontend/src/pages/PacienteDetallePage.jsx`

- [ ] **Crear PacienteDetallePage.jsx**

```jsx
// frontend/src/pages/PacienteDetallePage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaciente, updatePaciente } from '../api/pacientes';
import { getHistoria } from '../api/historiasClinicas';
import { getNotasByPaciente } from '../api/notasVisita';
import HistoriaClinicaForm from '../components/HistoriaClinicaForm';
import NotaVisitaModal from '../components/NotaVisitaModal';
import PacienteFormModal from '../components/PacienteFormModal';
import logoGioval from '../assets/gioval-logo.png';

const ESTATUS_COLOR = {
  pendiente: '#aba3ba',
  realizada: '#4ade80',
  cancelada: '#f87171',
};

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-[var(--color-accent)]' : 'border-transparent hover:opacity-70'}`}
            style={{ color: active ? 'var(--color-accent)' : 'var(--color-dark)' }}>
      {children}
    </button>
  );
}

export default function PacienteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [historia, setHistoria] = useState(null);
  const [notas, setNotas] = useState([]);
  const [tab, setTab] = useState('historia');
  const [notaModal, setNotaModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true);
    try {
      const [p, h, n] = await Promise.all([
        getPaciente(id),
        getHistoria(id),
        getNotasByPaciente(id),
      ]);
      setPaciente(p);
      setHistoria(h);
      setNotas(n);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [id]);

  if (loading) return <p className="text-sm text-gray-500 mt-8">Cargando expediente…</p>;
  if (!paciente) return <p className="text-sm text-red-500 mt-8">Paciente no encontrado.</p>;

  function nombreCompleto() {
    return [paciente.apellido_paterno, paciente.apellido_materno, paciente.nombre].filter(Boolean).join(' ');
  }

  const citasSinNota = (paciente.citas || []).filter(c =>
    c.estatus === 'realizada' && !notas.some(n => n.cita_id === c.id)
  );

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pacientes')}
                className="text-sm" style={{ color: 'var(--color-accent)' }}>
          ← Pacientes
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6 flex items-start justify-between"
           style={{ borderColor: 'var(--color-sage)' }}>
        <div className="flex items-center gap-4">
          <img src={logoGioval} alt="gioval" className="h-10 object-contain"
               style={{ filter: 'brightness(0.4) sepia(1) saturate(0.5)' }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-dark)' }}>{nombreCompleto()}</h1>
            <p className="text-sm text-gray-500">
              {paciente.telefono || ''} {paciente.edad ? `· ${paciente.edad} años` : ''}
              {paciente.sexo ? ` · ${paciente.sexo}` : ''}
              {paciente.ocupacion ? ` · ${paciente.ocupacion}` : ''}
            </p>
          </div>
        </div>
        <button onClick={() => setEditModal(true)}
                className="text-sm border rounded-lg px-3 py-1"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-dark)' }}>
          Editar datos
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6 flex gap-1" style={{ borderColor: 'var(--color-sage)' }}>
        <TabBtn active={tab === 'historia'} onClick={() => setTab('historia')}>Historia Clínica</TabBtn>
        <TabBtn active={tab === 'citas'} onClick={() => setTab('citas')}>
          Citas {paciente.citas?.length ? `(${paciente.citas.length})` : ''}
        </TabBtn>
        <TabBtn active={tab === 'notas'} onClick={() => setTab('notas')}>
          Notas de Visita {notas.length ? `(${notas.length})` : ''}
        </TabBtn>
      </div>

      {/* Tab: Historia Clínica */}
      {tab === 'historia' && historia && (
        <HistoriaClinicaForm
          pacienteId={id}
          historia={historia}
          onSaved={setHistoria}
        />
      )}

      {/* Tab: Citas */}
      {tab === 'citas' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden"
             style={{ borderColor: 'var(--color-sage)' }}>
          {!paciente.citas?.length ? (
            <p className="p-6 text-sm text-gray-400">Sin citas registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-primary)' }}>
                  {['Fecha y hora','Tratamiento','Empleada','Estatus'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                        style={{ color: 'var(--color-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paciente.citas.map(c => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-sage)' }}>
                    <td className="px-4 py-3">
                      {new Date(c.fecha_hora).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">{c.tratamiento_nombre || '—'}</td>
                    <td className="px-4 py-3">{c.empleada_nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs text-white"
                            style={{ backgroundColor: ESTATUS_COLOR[c.estatus] || '#ccc' }}>
                        {c.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Notas */}
      {tab === 'notas' && (
        <div>
          {citasSinNota.length > 0 && (
            <div className="mb-4">
              <button onClick={() => setNotaModal({ cita: citasSinNota[0], nota: null })}
                      className="px-4 py-2 text-sm text-white rounded-lg"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                + Nueva nota de visita
              </button>
            </div>
          )}
          {notas.length === 0 ? (
            <p className="text-sm text-gray-400">Sin notas de visita registradas.</p>
          ) : (
            <div className="space-y-3">
              {notas.map(n => (
                <div key={n.id} className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-shadow"
                     style={{ borderColor: 'var(--color-sage)' }}
                     onClick={() => {
                       const cita = paciente.citas?.find(c => c.id === n.cita_id) || { id: n.cita_id, fecha_hora: n.fecha_hora };
                       setNotaModal({ cita, nota: n });
                     }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-dark)' }}>
                        {new Date(n.created_at).toLocaleDateString('es-MX', { dateStyle: 'long' })}
                      </p>
                      <p className="text-xs text-gray-500">{n.tratamiento_nombre || ''} · {n.creado_por_nombre || ''}</p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>Editar →</span>
                  </div>
                  {n.evolucion && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{n.evolucion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {notaModal && (
        <NotaVisitaModal
          cita={notaModal.cita}
          pacienteId={parseInt(id)}
          nota={notaModal.nota}
          onClose={() => setNotaModal(null)}
          onSaved={() => { setNotaModal(null); cargar(); }}
        />
      )}

      {editModal && (
        <PacienteFormModal
          paciente={paciente}
          onClose={() => setEditModal(false)}
          onSaved={() => { setEditModal(false); cargar(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
cd ~/elys && git add frontend/src/pages/PacienteDetallePage.jsx
git commit -m "feat: PacienteDetallePage con tabs de historia, citas y notas"
```

---

## Task 10: Frontend — CitaModal (autocomplete + PacienteMiniModal)

**Files:**
- Create: `frontend/src/components/PacienteMiniModal.jsx`
- Modify: `frontend/src/components/CitaModal.jsx`

- [ ] **Crear PacienteMiniModal.jsx**

```jsx
// frontend/src/components/PacienteMiniModal.jsx
import { useState } from 'react';
import { createPaciente } from '../api/pacientes';

export default function PacienteMiniModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ apellido_paterno: '', nombre: '', telefono: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const paciente = await createPaciente({
        ...form,
        fecha_registro: new Date().toISOString().split('T')[0],
      });
      onCreated(paciente);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
           style={{ borderTop: '4px solid var(--color-accent)' }}>
        <div className="p-5">
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-dark)' }}>
            Registrar paciente rápido
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Completa el expediente completo después desde el módulo Pacientes.
          </p>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido paterno *</label>
              <input type="text" required value={form.apellido_paterno}
                     onChange={e => set('apellido_paterno', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre(s) *</label>
              <input type="text" required value={form.nombre}
                     onChange={e => set('nombre', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input type="text" value={form.telefono}
                     onChange={e => set('telefono', e.target.value)}
                     className="w-full border rounded-lg px-3 py-2 text-sm"
                     style={{ borderColor: 'var(--color-primary)' }} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={onClose}
                      className="px-3 py-2 text-sm border rounded-lg"
                      style={{ borderColor: 'var(--color-primary)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                      className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                {loading ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Modificar CitaModal.jsx — agregar imports al inicio**

En la línea de import de React existente (que ya tiene `useState`, `useEffect`), agregar `useRef`:

```js
import { useState, useEffect, useRef } from 'react';
```

Agregar debajo de los imports de api existentes:

```js
import { buscarPacientes } from '../api/pacientes';
import PacienteMiniModal from './PacienteMiniModal';
```

- [ ] **Agregar estado de paciente en CitaModal — dentro del componente, junto a los estados existentes**

```js
const [pacienteQuery, setPacienteQuery] = useState('');
const [pacienteSugerencias, setPacienteSugerencias] = useState([]);
const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
const [miniModal, setMiniModal] = useState(false);
const searchRef = useRef(null);
```

- [ ] **Agregar efecto de búsqueda de paciente — dentro del componente**

```js
useEffect(() => {
  if (pacienteQuery.length < 2) { setPacienteSugerencias([]); return; }
  const timer = setTimeout(() => {
    buscarPacientes(pacienteQuery).then(setPacienteSugerencias).catch(console.error);
  }, 300);
  return () => clearTimeout(timer);
}, [pacienteQuery]);
```

- [ ] **Inicializar paciente seleccionado al abrir la cita (para modo edición)**

Agregar también import de `getPaciente` en CitaModal:

```js
import { buscarPacientes, getPaciente } from '../api/pacientes';
```

Al final del `useEffect` donde se carga el form inicial, agregar:

```js
if (cita?.paciente_id) {
  getPaciente(cita.paciente_id)
    .then(p => setPacienteSeleccionado(p))
    .catch(() => {
      // fallback: mostrar nombre_paciente del texto si falla
      setPacienteQuery(cita.nombre_paciente || '');
    });
}
```

- [ ] **Reemplazar el campo "Nombre paciente" en el JSX del CitaModal**

Buscar el bloque que contiene `value={form.nombre_paciente}` y reemplazarlo con:

```jsx
<div>
  <label className="block text-xs font-medium text-gray-600 mb-1">Paciente *</label>
  <div className="relative">
    <input
      type="text"
      disabled={!puedeEditar}
      value={pacienteSeleccionado
        ? [pacienteSeleccionado.apellido_paterno, pacienteSeleccionado.apellido_materno, pacienteSeleccionado.nombre].filter(Boolean).join(' ')
        : pacienteQuery}
      onChange={e => {
        setPacienteSeleccionado(null);
        setPacienteQuery(e.target.value);
      }}
      placeholder="Buscar paciente por nombre o teléfono…"
      className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
      style={{ borderColor: 'var(--color-primary)' }}
      ref={searchRef}
    />
    {pacienteSeleccionado && (
      <button type="button"
              onClick={() => { setPacienteSeleccionado(null); setPacienteQuery(''); }}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
    )}
    {!pacienteSeleccionado && pacienteQuery.length >= 2 && (
      <div className="absolute z-20 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"
           style={{ borderColor: 'var(--color-sage)' }}>
        {pacienteSugerencias.length === 0 ? (
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-2">Sin resultados para "{pacienteQuery}"</p>
            <button type="button"
                    onClick={() => setMiniModal(true)}
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-accent)' }}>
              + Registrar paciente nuevo
            </button>
          </div>
        ) : (
          <>
            {pacienteSugerencias.map(p => (
              <button key={p.id} type="button"
                      onClick={() => { setPacienteSeleccionado(p); setPacienteQuery(''); setPacienteSugerencias([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-0"
                      style={{ borderColor: 'var(--color-sage)' }}>
                <span className="font-medium">
                  {[p.apellido_paterno, p.apellido_materno, p.nombre].filter(Boolean).join(' ')}
                </span>
                {p.telefono && <span className="text-gray-400 text-xs ml-2">{p.telefono}</span>}
              </button>
            ))}
            <button type="button"
                    onClick={() => setMiniModal(true)}
                    className="w-full text-left px-3 py-2 text-xs"
                    style={{ color: 'var(--color-accent)' }}>
              + Registrar paciente nuevo
            </button>
          </>
        )}
      </div>
    )}
  </div>
</div>
```

- [ ] **Incluir `paciente_id` al enviar la cita — modificar `handleSubmit` en CitaModal**

En la llamada a `createCita`/`updateCita`, agregar `paciente_id: pacienteSeleccionado?.id` al objeto de datos enviado.

- [ ] **Renderizar PacienteMiniModal al final del JSX del CitaModal** (antes del cierre del fragmento principal):

```jsx
{miniModal && (
  <PacienteMiniModal
    onClose={() => setMiniModal(false)}
    onCreated={(p) => {
      setPacienteSeleccionado(p);
      setPacienteSugerencias([]);
      setPacienteQuery('');
      setMiniModal(false);
    }}
  />
)}
```

- [ ] **Commit**

```bash
cd ~/elys && git add frontend/src/components/CitaModal.jsx \
  frontend/src/components/PacienteMiniModal.jsx
git commit -m "feat: CitaModal con autocomplete de pacientes y registro rápido"
```

---

## Task 11: Frontend — Navegación y rutas en App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Agregar imports en App.jsx** — junto a los imports de páginas existentes:

```js
import PacientesPage from './pages/PacientesPage';
import PacienteDetallePage from './pages/PacienteDetallePage';
```

- [ ] **Agregar NavItem de Pacientes** — dentro del `<div className="flex gap-1 flex-1 flex-wrap">`, después del NavItem de Citas:

```jsx
<NavItem to="/pacientes">Pacientes</NavItem>
```

- [ ] **Agregar rutas** — dentro del `<Routes>` del Layout, después de la ruta de citas:

```jsx
<Route path="/pacientes" element={<PacientesPage />} />
<Route path="/pacientes/:id" element={<PacienteDetallePage />} />
```

- [ ] **Verificar en browser**

```bash
cd ~/elys/frontend && npm run dev
# Abrir http://localhost:5173
# Verificar que aparece "Pacientes" en la navegación
# Hacer click → debe mostrar la lista (vacía o con pacientes de prueba)
# Click "Nueva paciente" → debe abrir el modal
# Crear una paciente de prueba → debe aparecer en la lista
# Click en la paciente → debe abrir el perfil con 3 tabs
# Tab Historia Clínica → llenar algunos campos y guardar → debe mostrar "Historia clínica guardada"
# Ir a Citas → crear una cita → el campo paciente debe mostrar búsqueda autocomplete
```

- [ ] **Commit final**

```bash
cd ~/elys && git add frontend/src/App.jsx
git commit -m "feat: navegación y rutas del módulo Pacientes completo"
```

---

## Checklist de verificación final

- [ ] Ruta `GET /api/pacientes/buscar?q=garcia` devuelve array de pacientes
- [ ] Crear paciente crea automáticamente su `historia_clinica` vacía
- [ ] `PUT /api/historias-clinicas/:id` guarda campos JSONB (`app_datos`, `trat_prev_faciales`) correctamente
- [ ] Módulo Pacientes aparece en la navegación
- [ ] Lista de pacientes filtra por nombre y teléfono en tiempo real
- [ ] PacienteDetallePage muestra los 3 tabs
- [ ] Historia clínica: acordeón abre/cierra, Fitzpatrick visual, Glogau radio, checkboxes funcionan
- [ ] CitaModal: escribir ≥2 chars muestra dropdown; seleccionar paciente lo pre-llena; "Registrar paciente nuevo" abre mini modal
- [ ] Crear cita con paciente seleccionado guarda `paciente_id` en BD
- [ ] Tab Notas: citas realizadas sin nota muestran botón "Nueva nota"
