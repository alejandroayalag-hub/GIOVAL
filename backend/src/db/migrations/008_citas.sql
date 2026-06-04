CREATE TABLE IF NOT EXISTS tratamientos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL UNIQUE,
  duracion_min INTEGER NOT NULL DEFAULT 60,
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citas (
  id               SERIAL PRIMARY KEY,
  nombre_paciente  VARCHAR(200) NOT NULL,
  telefono         VARCHAR(20),
  tratamiento_id   INTEGER REFERENCES tratamientos(id) ON DELETE SET NULL,
  empleada_id      INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  fecha_hora       TIMESTAMPTZ NOT NULL,
  notas            TEXT,
  estatus          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                   CHECK (estatus IN ('pendiente', 'realizada', 'cancelada')),
  created_by       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
