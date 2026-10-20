-- 048: catálogo por marca que promociona el producto (antes todo REVE/DermaZone/BioElite colgaba de OmicronLab, que solo distribuye/factura).
-- CxP de OmicronLab no se toca (cuentas_por_pagar tiene su propio proveedor_id).
BEGIN;

INSERT INTO farmacia_proveedores (nombre, categoria)
SELECT v.n, 'Farmacia' FROM (VALUES ('DermaZone'), ('BioElite')) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM farmacia_proveedores p WHERE p.nombre = v.n);

-- Los del pedido OmicronLab (040) no traían categoria: se deduce del código
UPDATE farmacia_productos SET categoria = 'REVE'      WHERE categoria IS NULL AND codigo_proveedor LIKE 'REVE %';
UPDATE farmacia_productos SET categoria = 'DermaZone' WHERE categoria IS NULL AND codigo_proveedor LIKE 'DZ %';

UPDATE farmacia_productos fp SET proveedor_id = pr.id, actualizado_en = NOW()
FROM farmacia_proveedores pr
WHERE pr.nombre = CASE fp.categoria WHEN 'REVE' THEN 'REVE' WHEN 'DermaZone' THEN 'DermaZone' WHEN 'BioElite' THEN 'BioElite' END
  AND fp.proveedor_id IS DISTINCT FROM pr.id;

COMMIT;
