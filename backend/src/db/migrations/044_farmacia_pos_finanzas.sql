-- 044: punto de venta de farmacia usable + finanzas de farmacia separadas de la clínica.

-- Rol de la encargada de farmacia (solo ve el módulo Farmacia)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'asistente_medico', 'cosmetista', 'asistente_general', 'farmacia'));

-- UNIQUE(empleado_id, estado) impedía cerrar caja más de una vez por empleado.
-- Lo correcto: máximo una caja ABIERTA por empleado.
ALTER TABLE farmacia_caja DROP CONSTRAINT IF EXISTS farmacia_caja_empleado_id_estado_key;
CREATE UNIQUE INDEX IF NOT EXISTS farmacia_caja_una_abierta ON farmacia_caja (empleado_id) WHERE estado = 'abierta';
ALTER TABLE farmacia_caja ADD COLUMN IF NOT EXISTS efectivo_esperado NUMERIC(10,2);

ALTER TABLE farmacia_ventas
  ADD COLUMN IF NOT EXISTS caja_id       INT REFERENCES farmacia_caja(id),
  ADD COLUMN IF NOT EXISTS cancelada_por INT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS cancelada_en  TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_farmacia_ventas_caja ON farmacia_ventas (caja_id);

-- Costo congelado al vender (utilidad no cambia si luego cambia precio_costo)
ALTER TABLE farmacia_items_venta ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(10,2);
-- NOT VALID: solo aplica a filas nuevas, no truena si hay basura vieja
ALTER TABLE farmacia_items_venta DROP CONSTRAINT IF EXISTS farmacia_items_cantidad_pos;
ALTER TABLE farmacia_items_venta ADD CONSTRAINT farmacia_items_cantidad_pos CHECK (cantidad > 0) NOT VALID;

-- Cuentas por pagar: separar las de farmacia de las de la clínica
ALTER TABLE cuentas_por_pagar ADD COLUMN IF NOT EXISTS area VARCHAR(10) NOT NULL DEFAULT 'clinica';
ALTER TABLE cuentas_por_pagar DROP CONSTRAINT IF EXISTS cuentas_por_pagar_area_check;
ALTER TABLE cuentas_por_pagar ADD CONSTRAINT cuentas_por_pagar_area_check CHECK (area IN ('clinica', 'farmacia'));
UPDATE cuentas_por_pagar SET area = 'farmacia' WHERE concepto LIKE 'Farmacia —%';

-- Egresos propios de farmacia (no tocan movimientos de la clínica)
CREATE TABLE IF NOT EXISTS farmacia_egresos (
  id         SERIAL PRIMARY KEY,
  fecha      DATE          NOT NULL DEFAULT CURRENT_DATE,
  categoria  VARCHAR(20)   NOT NULL CHECK (categoria IN ('compra', 'renta', 'servicios', 'otro')),
  concepto   TEXT          NOT NULL,
  monto      NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  forma_pago VARCHAR(20)   NOT NULL DEFAULT 'transferencia'
             CHECK (forma_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  cxp_id     INT           REFERENCES cuentas_por_pagar(id) ON DELETE SET NULL,
  created_by INT           REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farmacia_egresos_fecha ON farmacia_egresos (fecha);

-- Facturas de farmacia ya pagadas (OmicronLab, 043) → egreso de compra
INSERT INTO farmacia_egresos (fecha, categoria, concepto, monto, forma_pago, cxp_id)
SELECT COALESCE(c.fecha_factura, CURRENT_DATE), 'compra',
       'Pago factura ' || COALESCE(c.folio_factura, '') || ' — ' || COALESCE(c.proveedor_nombre, ''),
       c.pagado, 'transferencia', c.id
FROM cuentas_por_pagar c
WHERE c.area = 'farmacia' AND c.pagado > 0
  AND NOT EXISTS (SELECT 1 FROM farmacia_egresos e WHERE e.cxp_id = c.id);
