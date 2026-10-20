-- Agenda en línea desde la landing (gioval.mx/agendar)

-- Qué especialista realiza qué tratamiento (define disponibilidad en línea)
CREATE TABLE IF NOT EXISTS empleado_tratamiento (
  empleado_id    INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tratamiento_id INTEGER NOT NULL REFERENCES tratamientos(id) ON DELETE CASCADE,
  PRIMARY KEY (empleado_id, tratamiento_id)
);

-- Estatus nuevos:
--   apartada      = horario retenido mientras el paciente paga el anticipo (expira en apartada_hasta)
--   por_confirmar = reservada en línea, espera aprobación de recepción
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estatus_check;
ALTER TABLE citas ADD CONSTRAINT citas_estatus_check
  CHECK (estatus IN ('apartada', 'por_confirmar', 'pendiente', 'realizada', 'cancelada'));

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS origen          VARCHAR(10) NOT NULL DEFAULT 'interno',
  ADD COLUMN IF NOT EXISTS email           VARCHAR(150),
  ADD COLUMN IF NOT EXISTS token           UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS apartada_hasta  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anticipo        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS anticipo_estado VARCHAR(12)
    CHECK (anticipo_estado IN ('pendiente', 'pagado', 'por_devolver', 'devuelto', 'retenido')),
  ADD COLUMN IF NOT EXISTS mp_payment_id   VARCHAR(40);

CREATE INDEX IF NOT EXISTS citas_empleada_fecha_idx ON citas (empleada_id, fecha_hora);

INSERT INTO categorias_movimiento (nombre, tipo)
SELECT 'Anticipo cita', 'ambos' WHERE NOT EXISTS (SELECT 1 FROM categorias_movimiento WHERE nombre = 'Anticipo cita');
