-- Solicitudes de cita desde la landing page pública
CREATE TABLE IF NOT EXISTS solicitudes_cita (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  telefono        VARCHAR(30)  NOT NULL,
  email           VARCHAR(150),
  servicio        VARCHAR(200),
  fecha_preferida DATE,
  notas           TEXT,
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'contactada', 'convertida', 'cancelada')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
