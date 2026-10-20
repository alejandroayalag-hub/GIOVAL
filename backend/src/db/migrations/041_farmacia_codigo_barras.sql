-- Código de barras en productos de farmacia (lector USB tipo teclado, igual que insumos)
ALTER TABLE farmacia_productos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_farmacia_prod_codigo_barras
  ON farmacia_productos(codigo_barras) WHERE codigo_barras IS NOT NULL;
