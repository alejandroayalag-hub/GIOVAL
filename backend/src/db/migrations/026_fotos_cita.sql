-- backend/src/db/migrations/026_fotos_cita.sql
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
