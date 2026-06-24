CREATE TABLE IF NOT EXISTS documentos_clinicos (
  id          SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo        VARCHAR(20) NOT NULL,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  datos       JSONB NOT NULL DEFAULT '{}',
  creado_por  INTEGER REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_clinicos_paciente ON documentos_clinicos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_docs_clinicos_tipo    ON documentos_clinicos(paciente_id, tipo);
