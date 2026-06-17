-- backend/src/db/migrations/027_laboratorios.sql
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
