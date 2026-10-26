-- 049: dos razones sociales en Finanzas — Giovanna (persona física) y Elys (persona moral).
-- Cada registro de dinero lleva su empresa; lo existente queda en Giovanna (DEFAULT).
-- Farmacia: las ventas se etiquetan, pero la caja física (farmacia_caja) es una sola y no se divide.
ALTER TABLE movimientos       ADD COLUMN IF NOT EXISTS empresa VARCHAR(10) NOT NULL DEFAULT 'giovanna' CHECK (empresa IN ('giovanna', 'elys'));
ALTER TABLE cortes_caja       ADD COLUMN IF NOT EXISTS empresa VARCHAR(10) NOT NULL DEFAULT 'giovanna' CHECK (empresa IN ('giovanna', 'elys'));
ALTER TABLE cuentas_por_pagar ADD COLUMN IF NOT EXISTS empresa VARCHAR(10) NOT NULL DEFAULT 'giovanna' CHECK (empresa IN ('giovanna', 'elys'));
ALTER TABLE nomina_mensual    ADD COLUMN IF NOT EXISTS empresa VARCHAR(10) NOT NULL DEFAULT 'giovanna' CHECK (empresa IN ('giovanna', 'elys'));
ALTER TABLE farmacia_ventas   ADD COLUMN IF NOT EXISTS empresa VARCHAR(10) NOT NULL DEFAULT 'giovanna' CHECK (empresa IN ('giovanna', 'elys'));
ALTER TABLE farmacia_egresos  ADD COLUMN IF NOT EXISTS empresa VARCHAR(10) NOT NULL DEFAULT 'giovanna' CHECK (empresa IN ('giovanna', 'elys'));

-- Un corte por día y por empresa
ALTER TABLE cortes_caja DROP CONSTRAINT IF EXISTS cortes_caja_fecha_key;
CREATE UNIQUE INDEX IF NOT EXISTS cortes_caja_fecha_empresa ON cortes_caja (fecha, empresa);
