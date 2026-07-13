-- Fase 1 inventario: código de barras + contenido por envase para alta de stock.
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS codigo_barras    VARCHAR(64),
  ADD COLUMN IF NOT EXISTS contenido_envase NUMERIC(12,4);

-- Único cuando hay valor; permite muchos NULL (insumos aún sin barcode asignado).
CREATE UNIQUE INDEX IF NOT EXISTS idx_insumos_codigo_barras
  ON insumos(codigo_barras) WHERE codigo_barras IS NOT NULL;
