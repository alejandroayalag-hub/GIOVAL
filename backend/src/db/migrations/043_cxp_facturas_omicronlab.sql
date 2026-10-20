-- Facturas CFDI del pedido OmicronLab cargado en 040 (un solo pedido). PUE + transferencia = pagadas.
-- El folio identifica la factura: antes de cargar inventario de una factura, buscar su folio aquí.
INSERT INTO cuentas_por_pagar (folio_factura, proveedor_id, proveedor_nombre, concepto, fecha_factura,
                               importe_total, pagado, estatus, forma_pago, observaciones)
SELECT v.folio, p.id, p.nombre, 'Farmacia — pedido OmicronLab (inventario migración 040)', DATE '2026-08-31',
       v.total, v.total, 'liquidada', 'Transferencia', 'UUID ' || v.uuid
FROM (VALUES
  ('F270954', 7658.49,  '99AFF20F-A544-11F1-9637-C9F030DA01FA'),
  ('F271002', 15988.63, '2C12BEBB-A562-11F1-98FE-0DA271164B71'),
  ('F271140', 9257.15,  'BE8085FE-A595-11F1-B0AF-6DD8EC1ACB3B')
) AS v(folio, total, uuid)
CROSS JOIN farmacia_proveedores p
WHERE p.nombre = 'OmicronLab S.A. de C.V.'
  AND NOT EXISTS (SELECT 1 FROM cuentas_por_pagar c WHERE c.folio_factura = v.folio);
