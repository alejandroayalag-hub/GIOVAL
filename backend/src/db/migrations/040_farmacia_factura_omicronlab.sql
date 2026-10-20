-- Alta de inventario Farmacia: pedido OmicronLab #9A842928 del 2026-10-19 (SPEI, total $32,904.27 c/IVA).
-- precio_costo = costo unitario de la factura (ya incluye IVA: las líneas suman el total $32,904.27). precio_venta = 0 a propósito: lo define Gioval
-- en Farmacia → Inventario; el POS no deja vender productos sin precio.
INSERT INTO farmacia_proveedores (nombre, telefono, condicion_pago, dias_credito, categoria)
VALUES ('OmicronLab S.A. de C.V.', '8115222896', 'Contado (SPEI)', 0, 'Farmacia')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO farmacia_productos (nombre, codigo_proveedor, precio_costo, precio_venta, stock, stock_minimo, proveedor_id)
SELECT v.nombre, v.codigo, v.costo, 0, v.piezas, 1, (SELECT id FROM farmacia_proveedores WHERE nombre = 'OmicronLab S.A. de C.V.')
FROM (VALUES
  ('Regenue Scar Gel. Pirfenidona 8% Polipéptidos 2% Gel 30 g',                           'DZ 54',   656.23, 5),
  ('Oxidermic APC. Adapaleno 0.15% Peróxido de Benzoilo 3% Clindamicina 1% Gel Crema 30 ml', 'DZ 70', 300.00, 5),
  ('Neudermic Gentle Skin Cleanser 240 ml',                                               'REVE 14', 266.80, 5),
  ('Dibel Suero Facial Luminiscente 30 ml',                                               'REVE 41', 510.01, 5),
  ('Dibel H&L Hyaluronic Vit B5 30 ml',                                                   'REVE 44', 464.00, 5),
  ('Neudermic BioAqua Hydrating Cleanser 480 ml',                                         'REVE 46', 295.80, 5),
  ('Telica. Tetracaína 7% Lidocaína 23% Hidralub Ungüento 7.5 ml',                        'DZ 28',   310.00, 3),
  ('Capilarium Red. Minoxidil 5% Clobetasol 0.015% Ác. Retinoico 0.025% Loción 100 ml',   'DZ 45',   462.00, 3),
  ('ClareSkin Spotless Forte. Ác. Azelaico 7% Ác. Retinoico 0.05% Niacinamida 4% Suero 15 ml', 'DZ 71', 290.00, 3),
  ('Dibel Vitamina C Booster Serum 30 ml',                                                'REVE 45', 696.00, 3),
  ('Metformina HCl 20% Crema 30 ml',                                                      '4878 30', 159.00, 2),
  ('Capilarium Shampoo gel semisólido (Bamboo + Queratina) 300 ml',                       'DZ 17',   475.60, 2),
  ('Regenue 50. Ác. Retinoico 0.05% Ác. Hialurónico 3% Crema 50 ml',                      'DZ 19',   231.00, 2),
  ('Hidractive Urea 20. Gel Aceite 200 ml',                                               'DZ 37',   219.24, 2),
  ('Capilarium Shampoo Dermatitis Seborreica 100 ml',                                     'DZ 67',   255.00, 2),
  ('Dibel Crema Beauté 50 ml',                                                            'REVE 40', 788.80, 2),
  ('Dibel Lumière Crema Facial antienvejecimiento',                                       'REVE 42', 696.00, 2),
  ('Dibel Retinol Intensive Glow 30 ml (Noche)',                                          'REVE 55', 672.80, 2),
  ('Capilarium BIO Shampoo 200 ml',                                                       'REVE 57', 475.60, 2),
  -- Promo 5+1: 6 piezas por renglón, costo prorrateado. Factura no trae el nombre del producto: renombrar.
  ('REVE 33 (promo 5+1, renombrar)',                                                      'REVE 33', 270.83, 6),
  ('REVE 36 (promo 5+1, renombrar)',                                                      'REVE 36', 381.83, 6),
  ('REVE 50 (promo 5+1, renombrar)',                                                      'REVE 50', 231.67, 6),
  ('REVE 63 (promo 5+1, renombrar)',                                                      'REVE 63', 319.00, 6)
) AS v(nombre, codigo, costo, piezas);
