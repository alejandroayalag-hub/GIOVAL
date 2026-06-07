CREATE TABLE IF NOT EXISTS consentimientos (
  id                    SERIAL PRIMARY KEY,
  tratamiento_id        INTEGER UNIQUE REFERENCES tratamientos(id) ON DELETE CASCADE,
  titulo                VARCHAR(200),
  texto_consentimiento  TEXT,
  cuidados_pre          TEXT,
  cuidados_post         TEXT,
  activo                BOOLEAN NOT NULL DEFAULT true,
  updated_by            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consentimientos_firmados (
  id                SERIAL PRIMARY KEY,
  consentimiento_id INTEGER NOT NULL REFERENCES consentimientos(id) ON DELETE CASCADE,
  paciente_id       INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  cita_id           INTEGER REFERENCES citas(id) ON DELETE SET NULL,
  nombre_paciente   VARCHAR(300) NOT NULL,
  tratamiento_nombre VARCHAR(200),
  firma_imagen      TEXT NOT NULL,
  fecha_firmado     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  firmado_por       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);
