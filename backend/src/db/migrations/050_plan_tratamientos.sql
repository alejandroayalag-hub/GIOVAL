-- Migración 050: plan de tratamiento (Fase 1)
-- Cada tratamiento propuesto en una valoración; avanza sugerido → aceptado → completado.

CREATE TABLE IF NOT EXISTS plan_tratamientos (
  id                  SERIAL PRIMARY KEY,
  paciente_id         INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tratamiento_id      INTEGER NOT NULL REFERENCES tratamientos(id),
  valoracion_id       INTEGER REFERENCES documentos_clinicos(id) ON DELETE SET NULL,
  diagnostico_id      INTEGER REFERENCES paciente_diagnosticos(id) ON DELETE SET NULL,
  sesiones_estimadas  INTEGER NOT NULL DEFAULT 1 CHECK (sesiones_estimadas >= 1),
  frecuencia          TEXT,
  notas               TEXT,
  estatus             VARCHAR(12) NOT NULL DEFAULT 'sugerido'
                      CHECK (estatus IN ('sugerido', 'aceptado', 'completado', 'cancelado')),
  motivo_cancelacion  TEXT,
  created_by          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_trat_paciente   ON plan_tratamientos(paciente_id, estatus);
CREATE INDEX IF NOT EXISTS idx_plan_trat_valoracion ON plan_tratamientos(valoracion_id);

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS plan_tratamiento_id INTEGER REFERENCES plan_tratamientos(id) ON DELETE SET NULL;

ALTER TABLE documentos_clinicos
  ADD COLUMN IF NOT EXISTS cita_id INTEGER REFERENCES citas(id) ON DELETE SET NULL;
