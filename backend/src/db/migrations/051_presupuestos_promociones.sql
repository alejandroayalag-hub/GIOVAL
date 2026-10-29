-- Migración 051: promociones, presupuestos firmados y CI por tratamiento (Fase 2)

CREATE TABLE IF NOT EXISTS promociones (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  descuento_pct  NUMERIC(5,2) NOT NULL CHECK (descuento_pct > 0 AND descuento_pct <= 100),
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE NOT NULL,
  solo_completo  BOOLEAN NOT NULL DEFAULT false,
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_by     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE IF NOT EXISTS promocion_tratamientos (
  promocion_id    INTEGER NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
  tratamiento_id  INTEGER NOT NULL REFERENCES tratamientos(id) ON DELETE CASCADE,
  PRIMARY KEY (promocion_id, tratamiento_id)
);

CREATE TABLE IF NOT EXISTS presupuestos (
  id           SERIAL PRIMARY KEY,
  paciente_id  INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  total        NUMERIC(12,2) NOT NULL,
  firma        TEXT NOT NULL,            -- dataURL cifrado (utils/cifrado)
  firmado_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip           TEXT,
  user_agent   TEXT,
  created_by   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_presupuestos_paciente ON presupuestos(paciente_id);

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id                   SERIAL PRIMARY KEY,
  presupuesto_id       INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  plan_tratamiento_id  INTEGER NOT NULL REFERENCES plan_tratamientos(id),
  modalidad            VARCHAR(12) NOT NULL CHECK (modalidad IN ('por_sesion', 'completo')),
  sesiones             INTEGER NOT NULL CHECK (sesiones >= 1),
  precio_unitario      NUMERIC(10,2) NOT NULL,
  promocion_id         INTEGER REFERENCES promociones(id) ON DELETE SET NULL,
  descuento_pct        NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal             NUMERIC(12,2) NOT NULL
);

ALTER TABLE plan_tratamientos
  ADD COLUMN IF NOT EXISTS presupuesto_item_id INTEGER REFERENCES presupuesto_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consentimiento_firmado_id INTEGER REFERENCES consentimientos_firmados(id) ON DELETE SET NULL;

ALTER TABLE consentimientos_firmados
  ADD COLUMN IF NOT EXISTS plan_tratamiento_id INTEGER REFERENCES plan_tratamientos(id) ON DELETE SET NULL;
