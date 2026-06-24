CREATE TABLE IF NOT EXISTS consultorios (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(100) NOT NULL,
  activo  BOOLEAN NOT NULL DEFAULT true,
  orden   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO consultorios (nombre, orden) VALUES
  ('Consultorio 1', 1),
  ('Consultorio 2', 2),
  ('Consultorio 3', 3)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS flujo_paciente (
  id                 SERIAL PRIMARY KEY,
  cita_id            INTEGER NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
  consultorio_id     INTEGER REFERENCES consultorios(id) ON DELETE SET NULL,
  estatus            VARCHAR(30) NOT NULL DEFAULT 'checkin'
                     CHECK (estatus IN ('checkin','en_consultorio','en_procedimiento',
                                        'cierre','en_caja','completado')),
  nota_visita_id     INTEGER REFERENCES notas_visita(id) ON DELETE SET NULL,
  hora_checkin       TIMESTAMPTZ DEFAULT NOW(),
  hora_consultorio   TIMESTAMPTZ,
  hora_procedimiento TIMESTAMPTZ,
  hora_cierre        TIMESTAMPTZ,
  hora_caja          TIMESTAMPTZ,
  hora_completado    TIMESTAMPTZ,
  created_by         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
