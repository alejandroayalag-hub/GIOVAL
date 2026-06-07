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

  ah_diabetes         BOOLEAN NOT NULL DEFAULT false,
  ah_cardiopatias     BOOLEAN NOT NULL DEFAULT false,
  ah_hematologicas    BOOLEAN NOT NULL DEFAULT false,
  ah_hipertension     BOOLEAN NOT NULL DEFAULT false,
  ah_nefropatias      BOOLEAN NOT NULL DEFAULT false,
  ah_oncologicos      BOOLEAN NOT NULL DEFAULT false,
  ah_endocrinologicas BOOLEAN NOT NULL DEFAULT false,
  ah_otras            BOOLEAN NOT NULL DEFAULT false,
  ah_otras_texto      TEXT,

  app_datos           JSONB NOT NULL DEFAULT '{}',

  ejercicio           TEXT,
  ingesta_agua        TEXT,
  alimentacion        TEXT,
  trastornos_alim     TEXT,
  apetito             TEXT,
  antojos             TEXT,
  nivel_energia       TEXT,
  nivel_motivacion    TEXT,

  menarca             TEXT,
  fum                 TEXT,
  ritmo_menstrual     TEXT,
  gesta               TEXT,
  partos              TEXT,
  abortos             TEXT,
  cesareas            TEXT,
  complicaciones_emb  TEXT,
  mac                 TEXT,

  piel_limpieza          TEXT,
  piel_hidratacion       TEXT,
  piel_proteccion_solar  TEXT,
  piel_rutina_noche      TEXT,
  piel_desmaquillar      TEXT,
  piel_exposicion_sol    TEXT,
  piel_retoque_protector TEXT,
  piel_tiempo_dedicado   TEXT,

  mc_envejecimiento    BOOLEAN NOT NULL DEFAULT false,
  mc_estrias           BOOLEAN NOT NULL DEFAULT false,
  mc_deshidratacion    BOOLEAN NOT NULL DEFAULT false,
  mc_adiposidad        BOOLEAN NOT NULL DEFAULT false,
  mc_hiperpigmentacion BOOLEAN NOT NULL DEFAULT false,
  mc_obesidad          BOOLEAN NOT NULL DEFAULT false,
  mc_acne              BOOLEAN NOT NULL DEFAULT false,
  mc_flacidez          BOOLEAN NOT NULL DEFAULT false,
  mc_especifique       TEXT,

  trat_prev_faciales   JSONB NOT NULL DEFAULT '[]',
  trat_prev_corporales JSONB NOT NULL DEFAULT '[]',

  fitzpatrick   INTEGER CHECK (fitzpatrick BETWEEN 1 AND 6),
  glogau        INTEGER CHECK (glogau BETWEEN 1 AND 4),
  tipo_rostro   TEXT,
  tipo_piel     TEXT,
  lesiones_derm TEXT,
  tipo_lesion   TEXT,
  localizacion  TEXT,

  sv_fc          TEXT,
  sv_fr          TEXT,
  sv_ta          TEXT,
  sv_temperatura TEXT,
  sv_saturacion  TEXT,
  sv_peso        TEXT,
  sv_talla       TEXT,
  sv_imc         TEXT,

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
