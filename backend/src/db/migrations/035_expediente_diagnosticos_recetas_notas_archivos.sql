-- backend/src/db/migrations/035_expediente_diagnosticos_recetas_notas_archivos.sql
-- Expediente: diagnósticos CIE-10, recetas, notas médicas libres, archivos del paciente

CREATE TABLE cie10_catalogo (
  codigo      VARCHAR(10) PRIMARY KEY,
  descripcion TEXT NOT NULL
);
-- ponytail: búsqueda con ILIKE sobre 14k filas, índice trigram si algún día se siente lento

CREATE TABLE paciente_diagnosticos (
  id           SERIAL PRIMARY KEY,
  paciente_id  INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  cie10_codigo VARCHAR(10) NOT NULL REFERENCES cie10_catalogo(codigo),
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  estatus      VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estatus IN ('activo', 'resuelto')),
  notas        TEXT,
  created_by   INTEGER REFERENCES usuarios(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_paciente_diagnosticos_paciente ON paciente_diagnosticos(paciente_id);

CREATE TABLE recetas (
  id             SERIAL PRIMARY KEY,
  paciente_id    INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  diagnostico_id INTEGER REFERENCES paciente_diagnosticos(id) ON DELETE SET NULL,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  medicamentos   JSONB NOT NULL DEFAULT '[]',
  indicaciones   TEXT,
  created_by     INTEGER REFERENCES usuarios(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recetas_paciente ON recetas(paciente_id);

CREATE TABLE notas_medicas (
  id          SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  contenido   TEXT NOT NULL,
  created_by  INTEGER REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notas_medicas_paciente ON notas_medicas(paciente_id);

CREATE TABLE paciente_archivos (
  id          SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  categoria   VARCHAR(20) NOT NULL CHECK (categoria IN ('foto', 'laboratorio', 'expediente_externo', 'poliza_seguro', 'otro')),
  nombre      TEXT NOT NULL,
  archivo     TEXT NOT NULL,
  fecha       DATE,
  notas       TEXT,
  creado_por  INTEGER REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_paciente_archivos_paciente ON paciente_archivos(paciente_id);

-- Fusionar laboratorios existentes en paciente_archivos
INSERT INTO paciente_archivos (paciente_id, categoria, nombre, archivo, fecha, notas, creado_por, created_at)
SELECT paciente_id, 'laboratorio', nombre, archivo, fecha, notas, creado_por, created_at
FROM laboratorios;
