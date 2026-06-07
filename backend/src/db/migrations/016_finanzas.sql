-- Migration 016: Tablas para finanzas (categorias_movimiento, movimientos, cortes_caja)

-- ─── CATEGORÍAS DE MOVIMIENTO ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias_movimiento (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  tipo       VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'ambos')),
  color      VARCHAR(7)   NOT NULL DEFAULT '#887482',
  activo     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── MOVIMIENTOS (ingresos y egresos) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos (
  id           SERIAL PRIMARY KEY,
  tipo         VARCHAR(10)   NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria_id INTEGER       REFERENCES categorias_movimiento(id) ON DELETE SET NULL,
  concepto     TEXT          NOT NULL,
  monto        DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  forma_pago   VARCHAR(20)   NOT NULL DEFAULT 'efectivo'
               CHECK (forma_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  fecha        DATE          NOT NULL DEFAULT CURRENT_DATE,
  notas        TEXT,
  created_by   INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── CORTES DE CAJA ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cortes_caja (
  id             SERIAL PRIMARY KEY,
  fecha          DATE          NOT NULL UNIQUE,
  total_ingresos DECIMAL(12,2) NOT NULL,
  total_egresos  DECIMAL(12,2) NOT NULL,
  saldo          DECIMAL(12,2) NOT NULL,
  notas          TEXT,
  cerrado_por    INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  cerrado_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── SEED: Categorías iniciales ──────────────────────────────────────────────
INSERT INTO categorias_movimiento (nombre, tipo, color) VALUES
  ('Tratamiento',    'ingreso', '#4a7c6a'),
  ('Venta producto', 'ingreso', '#4a7c6a'),
  ('Depósito',       'ingreso', '#4a7c6a'),
  ('Nómina',         'egreso',  '#c0675a'),
  ('Insumos',        'egreso',  '#c0675a'),
  ('Renta',          'egreso',  '#c0675a'),
  ('Servicios',      'egreso',  '#c0675a'),
  ('Otros',          'ambos',   '#887482')
ON CONFLICT DO NOTHING;
