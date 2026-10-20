-- Facturas CFDI OmicronLab F270954, F271002 y F271140 (2026-08-31) = mismo pedido que la 040
-- (mismos productos y piezas, total $32,904.27): NO se suma stock. Solo traen el nombre real de las promos 5+1.
UPDATE farmacia_productos SET nombre = v.nombre
FROM (VALUES
  ('REVE 33', 'Oxidermic Toner 95 ml'),
  ('REVE 36', 'Oxidermic Foamer G5 200 ml'),
  ('REVE 50', 'Oxidermic Blemish Hydra Serum 30 ml'),
  ('REVE 63', 'ClareSkin Intimisse 30 ml')
) AS v(codigo, nombre)
WHERE farmacia_productos.codigo_proveedor = v.codigo
  AND farmacia_productos.nombre LIKE '%(promo 5+1, renombrar)';
