-- Migración 052: abonos a tratamientos completos (Fase 3). Saldo = subtotal − Σ abonos.
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS presupuesto_item_id INTEGER REFERENCES presupuesto_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_movimientos_presupuesto_item ON movimientos(presupuesto_item_id);
