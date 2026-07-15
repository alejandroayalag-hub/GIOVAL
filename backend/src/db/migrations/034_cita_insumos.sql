-- Fase 2 inventario: consumo real de insumos por cita + precio cobrado.
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS precio_cobrado      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS insumos_confirmados BOOLEAN NOT NULL DEFAULT false;

-- Consumo confirmado por cita, con snapshot de costo_unidad al momento de confirmar
-- (el costo del insumo puede cambiar después; el reporte de ganancia usa el snapshot).
CREATE TABLE IF NOT EXISTS cita_insumos (
  id           SERIAL PRIMARY KEY,
  cita_id      INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  insumo_id    INTEGER NOT NULL REFERENCES insumos(id),
  cantidad     NUMERIC(12,4) NOT NULL CHECK (cantidad > 0),
  costo_unidad NUMERIC(12,4) NOT NULL DEFAULT 0,
  creado_por   INTEGER,
  creado_en    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cita_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_cita_insumos_cita ON cita_insumos(cita_id);
