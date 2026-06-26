-- Migration 031: Nómina mensual y Cuentas por Pagar

CREATE TABLE IF NOT EXISTS nomina_mensual (
  id            SERIAL PRIMARY KEY,
  mes           VARCHAR(7)    NOT NULL,
  empleado_id   INTEGER       REFERENCES empleados(id) ON DELETE SET NULL,
  nombre_rol    VARCHAR(100)  NOT NULL,
  sueldo_base   NUMERIC(10,2) NOT NULL DEFAULT 0,
  comision      NUMERIC(10,2) NOT NULL DEFAULT 0,
  bono          NUMERIC(10,2) NOT NULL DEFAULT 0,
  rfc           VARCHAR(20),
  nss           VARCHAR(20),
  observaciones TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nomina_mes ON nomina_mensual(mes);

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
  id                SERIAL PRIMARY KEY,
  folio_factura     VARCHAR(50),
  proveedor_id      INTEGER       REFERENCES farmacia_proveedores(id) ON DELETE SET NULL,
  proveedor_nombre  VARCHAR(150),
  concepto          TEXT          NOT NULL,
  fecha_factura     DATE,
  fecha_vencimiento DATE,
  importe_total     NUMERIC(10,2) NOT NULL,
  pagado            NUMERIC(10,2) NOT NULL DEFAULT 0,
  estatus           VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                    CHECK (estatus IN ('pendiente','parcial','liquidada')),
  forma_pago        VARCHAR(20),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cxp_estatus ON cuentas_por_pagar(estatus);
CREATE INDEX IF NOT EXISTS idx_cxp_vencimiento ON cuentas_por_pagar(fecha_vencimiento);
