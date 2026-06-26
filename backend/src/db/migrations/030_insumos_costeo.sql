-- Importado de FINANZAS GIOVAL.xlsx (datos reales: Egresos, Catálogo Insumos,
-- Proveedores, Kit por Tratamiento). Resto del Excel era plantilla vacía.

-- ── Proveedores: campos adicionales (nullable, no rompe nada existente) ──
ALTER TABLE farmacia_proveedores
  ADD COLUMN IF NOT EXISTS rfc             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS condicion_pago  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS dias_credito    INTEGER,
  ADD COLUMN IF NOT EXISTS categoria       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banco_cuenta    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS observaciones   TEXT;

ALTER TABLE farmacia_proveedores
  ADD CONSTRAINT farmacia_proveedores_nombre_key UNIQUE (nombre);

-- ── Catálogo de insumos clínicos (uso en tratamientos, NO venta directa) ──
CREATE TABLE IF NOT EXISTS insumos (
  id              SERIAL PRIMARY KEY,
  codigo          VARCHAR(20) UNIQUE NOT NULL,
  nombre          VARCHAR(255) NOT NULL,
  proveedor       VARCHAR(100),
  presentacion    VARCHAR(50),
  precio_unitario NUMERIC(10,2) DEFAULT 0,
  costo_unidad    NUMERIC(12,6) DEFAULT 0,
  stock_minimo    INTEGER DEFAULT 0,
  stock_actual    INTEGER,
  categoria       VARCHAR(100),
  activo          BOOLEAN DEFAULT true,
  creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insumos_categoria ON insumos(categoria);

-- ── Kits genéricos de insumos por protocolo (costeo de cabina) ──
CREATE TABLE IF NOT EXISTS kits_insumos (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(150) UNIQUE NOT NULL,
  activo     BOOLEAN DEFAULT true,
  creado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kit_insumo_items (
  id         SERIAL PRIMARY KEY,
  kit_id     INTEGER NOT NULL REFERENCES kits_insumos(id) ON DELETE CASCADE,
  insumo_id  INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  cantidad   NUMERIC(10,4) NOT NULL,
  unidad     VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_kit_items_kit ON kit_insumo_items(kit_id);

-- Mapeo kit genérico → tratamiento real (uno a uno; solo los obvios,
-- el resto se asigna manualmente después)
CREATE TABLE IF NOT EXISTS tratamiento_kit (
  tratamiento_id  INTEGER PRIMARY KEY REFERENCES tratamientos(id) ON DELETE CASCADE,
  kit_id          INTEGER NOT NULL REFERENCES kits_insumos(id) ON DELETE CASCADE,
  creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Proveedores reales (Excel "Proveedores"; CFE y Contador se omiten:
-- son gasto de servicio, ya capturados en Egresos, no proveedores de insumo) ──
INSERT INTO farmacia_proveedores (nombre, rfc, condicion_pago, dias_credito, categoria) VALUES
  ('DMX Dermocosméticos',           'DMXD000000XXX', 'Crédito', 30, 'Productos cabina'),
  ('Toskani Cosmetics',             'TSKN000000XXX', 'Contado', NULL, 'Productos cabina'),
  ('Conquer Pharma',                'CNQR000000XXX', 'Contado', NULL, 'Insumos sueroterapia'),
  ('ALWEST (LumiMax)',              'ALWS000000XXX', 'Crédito', 60, 'Equipos médicos'),
  ('Erica Victoria Ávila (Equipos)','AVVE000000XXX', 'Crédito', 30, 'Equipos médicos'),
  ('Distribuidora material médico', NULL,            'Contado', NULL, 'Consumibles médicos'),
  ('Empresa residuos biológicos',   NULL,            'Mensual', 30, 'Residuos SEMARNAT')
ON CONFLICT (nombre) DO NOTHING;

-- ── Catálogo de insumos (92 productos) ──
INSERT INTO insumos (codigo, nombre, proveedor, presentacion, precio_unitario, costo_unidad, stock_minimo, categoria) VALUES
  ('CAT-001', 'Dermolimpiador espuma hidratante', 'DMX', '150 mL/g', 265, 1.766667, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-002', 'Dermolimpiador espuma seborregulador', 'DMX', '150 mL/g', 265, 1.766667, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-003', 'Dermolimpiador espuma control acné', 'DMX', '150 mL/g', 265, 1.766667, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-004', 'Dermolimpiador crema piel madura', 'DMX', '150 mL/g', 270, 1.8, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-005', 'Dermolimpiador crema piel sensible', 'DMX', '150 mL/g', 270, 1.8, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-006', 'Dermolimpiador crema aclarante / despigmentante', 'DMX', '150 mL/g', 270, 1.8, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-007', 'Exfoliante profesional hidratante', 'DMX', '250 mL/g', 455, 1.82, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-008', 'Exfoliante profesional seborregulador', 'DMX', '250 mL/g', 465, 1.86, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-009', 'Exfoliante profesional control acné', 'DMX', '250 mL/g', 465, 1.86, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-010', 'Exfoliante profesional aclarante', 'DMX', '250 mL/g', 455, 1.82, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-011', 'Exfoliante profesional pieles maduras', 'DMX', '250 mL/g', 455, 1.82, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-012', 'Exfoliante profesional piel sensible', 'DMX', '250 mL/g', 455, 1.82, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-013', 'Exfoliante enzimático (PCA Skin)', 'Otros', '100 mL/g', 295, 2.95, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-014', 'Crema desincrustante', 'DMX', '30 mL/g', 270, 9, 2, 'LIMPIEZA Y PREPARACIÓN DE PIEL'),
  ('CAT-020', 'Tónico hidratante DMX 150mL', 'DMX', '150 mL/g', 250, 1.666667, 2, 'TÓNICOS'),
  ('CAT-021', 'Tónico seborregulador DMX 150mL', 'DMX', '150 mL/g', 250, 1.666667, 2, 'TÓNICOS'),
  ('CAT-022', 'Tónico control acné DMX 150mL', 'DMX', '150 mL/g', 250, 1.666667, 2, 'TÓNICOS'),
  ('CAT-023', 'Tónico antioxidante DMX 150mL', 'DMX', '150 mL/g', 285, 1.9, 2, 'TÓNICOS'),
  ('CAT-024', 'Tónico reestructurante pieles maduras DMX', 'DMX', '150 mL/g', 250, 1.666667, 2, 'TÓNICOS'),
  ('CAT-025', 'Tónico calmante piel sensible DMX', 'DMX', '150 mL/g', 250, 1.666667, 2, 'TÓNICOS'),
  ('CAT-030', 'Mascarilla hidroplástica ultrahidratante DMX 250g', 'DMX', '250 pzs', 395, 1.58, 2, 'MASCARILLAS'),
  ('CAT-031', 'Mascarilla hidroplástica detox matificante DMX', 'DMX', '250 pzs', 395, 1.58, 2, 'MASCARILLAS'),
  ('CAT-032', 'Mascarilla hidroplástica antiacné DMX', 'DMX', '250 pzs', 395, 1.58, 2, 'MASCARILLAS'),
  ('CAT-033', 'Mascarilla hidroplástica aclarante DMX', 'DMX', '250 pzs', 395, 1.58, 2, 'MASCARILLAS'),
  ('CAT-034', 'Mascarilla hidroplástica pieles maduras DMX', 'DMX', '250 pzs', 395, 1.58, 2, 'MASCARILLAS'),
  ('CAT-035', 'Mascarilla hidroplástica calmante DMX', 'DMX', '250 pzs', 395, 1.58, 2, 'MASCARILLAS'),
  ('CAT-036', 'Velo facial ácido hialurónico DMX (10pzs)', 'DMX', '10 pzs', 445, 44.5, 2, 'MASCARILLAS'),
  ('CAT-037', 'Velo facial seborregulador DMX (10pzs)', 'DMX', '10 pzs', 445, 44.5, 2, 'MASCARILLAS'),
  ('CAT-038', 'Velo facial pieles maduras DMX (10pzs)', 'DMX', '10 pzs', 445, 44.5, 2, 'MASCARILLAS'),
  ('CAT-039', 'Velo facial calmante DMX (10pzs)', 'DMX', '10 pzs', 445, 44.5, 2, 'MASCARILLAS'),
  ('CAT-040', 'Velo facial regenerante PDRN DMX (10pzs)', 'DMX', '10 pzs', 645, 64.5, 2, 'MASCARILLAS'),
  ('CAT-041', 'Mascarilla cremosa células madre hidratación', 'DMX', '200 pzs', 650, 3.25, 2, 'MASCARILLAS'),
  ('CAT-042', 'Mascarilla cremosa células madre pieles maduras', 'DMX', '200 pzs', 735, 3.675, 2, 'MASCARILLAS'),
  ('CAT-043', 'Mascarilla cremosa aclarante células madre', 'DMX', '200 pzs', 715, 3.575, 2, 'MASCARILLAS'),
  ('CAT-050', 'Gel liposomado hidratante+ DMX 150mL', 'DMX', '150 mL/g', 705, 4.7, 2, 'GELES Y SUEROS'),
  ('CAT-051', 'Gel liposomado despigmentante+ DMX 150mL', 'DMX', '150 mL/g', 710, 4.733333, 2, 'GELES Y SUEROS'),
  ('CAT-052', 'Gel liposomado pieles maduras DMX 150mL', 'DMX', '150 mL/g', 715, 4.766667, 2, 'GELES Y SUEROS'),
  ('CAT-053', 'Gel liposomado seborregulador DMX 150mL', 'DMX', '150 mL/g', 650, 4.333333, 2, 'GELES Y SUEROS'),
  ('CAT-054', 'Gel liposomado calmante DMX 150mL', 'DMX', '150 mL/g', 645, 4.3, 2, 'GELES Y SUEROS'),
  ('CAT-055', 'Ampolleta regenerante PDRN DMX 50mL', 'DMX', '50 mL/g', 620, 12.4, 2, 'GELES Y SUEROS'),
  ('CAT-060', 'Contorno ojos efecto botox DMX 15mL', 'DMX', '15 mL/g', 495, 33, 2, 'CONTORNO DE OJOS'),
  ('CAT-061', 'Contorno ojos nutritivo DMX 15mL', 'DMX', '15 mL/g', 445, 29.666667, 2, 'CONTORNO DE OJOS'),
  ('CAT-062', 'Contorno ojos antiojeras DMX 15mL', 'DMX', '15 mL/g', 465, 31, 2, 'CONTORNO DE OJOS'),
  ('CAT-063', 'Contorno ojos despigmentante DMX 15mL', 'DMX', '15 mL/g', 475, 31.666667, 2, 'CONTORNO DE OJOS'),
  ('CAT-070', 'Gel seborregulador jengibre+carnitina DMX 500mL', 'DMX', '500 mL/g', 385, 0.77, 2, 'GELES APARATOLOGÍA'),
  ('CAT-071', 'Gel reestructurante silicio DMX 500mL', 'DMX', '500 mL/g', 620, 1.24, 2, 'GELES APARATOLOGÍA'),
  ('CAT-072', 'Gel calmante aloe+pepino DMX 500mL', 'DMX', '500 mL/g', 385, 0.77, 2, 'GELES APARATOLOGÍA'),
  ('CAT-073', 'RF TENSE crema conductora radiofrecuencia facial DMX', 'DMX', '500 mL/g', 745, 1.49, 2, 'GELES APARATOLOGÍA'),
  ('CAT-080', 'Hidrasolución A (limpieza) DMX 1L', 'DMX', '1000 mL/g', 550, 0.55, 2, 'HIDRASOLUCIONES'),
  ('CAT-081', 'Hidrasolución B (exfoliación) DMX 1L', 'DMX', '1000 mL/g', 550, 0.55, 2, 'HIDRASOLUCIONES'),
  ('CAT-082', 'Hidrasolución C (hidratación) DMX 1L', 'DMX', '1000 mL/g', 550, 0.55, 2, 'HIDRASOLUCIONES'),
  ('CAT-090', 'Peeling mandélico 30% DMX 10mL', 'DMX', '10 mL/g', 335, 33.5, 2, 'PEELINGS'),
  ('CAT-091', 'Peeling mandélico 50% DMX 10mL', 'DMX', '10 mL/g', 395, 39.5, 2, 'PEELINGS'),
  ('CAT-092', 'Peeling láctico 30% DMX 10mL', 'DMX', '10 mL/g', 185, 18.5, 2, 'PEELINGS'),
  ('CAT-093', 'Peeling láctico 50% DMX 10mL', 'DMX', '10 mL/g', 205, 20.5, 2, 'PEELINGS'),
  ('CAT-094', 'Peeling glicólico 20% DMX 10mL', 'DMX', '10 mL/g', 185, 18.5, 2, 'PEELINGS'),
  ('CAT-095', 'Peeling glicólico 35% DMX 10mL', 'DMX', '10 mL/g', 205, 20.5, 2, 'PEELINGS'),
  ('CAT-096', 'Peeling glicólico 50% DMX 10mL', 'DMX', '10 mL/g', 225, 22.5, 2, 'PEELINGS'),
  ('CAT-097', 'Peeling glicólico 70% DMX 10mL', 'DMX', '10 mL/g', 245, 24.5, 2, 'PEELINGS'),
  ('CAT-098', 'Peeling salicílico 20% DMX 10mL', 'DMX', '10 mL/g', 255, 25.5, 2, 'PEELINGS'),
  ('CAT-099', 'Peeling AHA''s DMX 50mL', 'DMX', '50 mL/g', 465, 9.3, 2, 'PEELINGS'),
  ('CAT-100', 'Solución neutralizante DMX 150mL', 'DMX', '150 mL/g', 305, 2.033333, 2, 'PEELINGS'),
  ('CAT-110', 'Fotoprotector crema FPS50+ cabina DMX 100mL', 'DMX', '100 mL/g', 420, 4.2, 2, 'FOTOPROTECTORES'),
  ('CAT-111', 'Fotoprotector gel FPS50+ piel grasa DMX 50mL', 'DMX', '50 mL/g', 340, 6.8, 2, 'FOTOPROTECTORES'),
  ('CAT-112', 'Fotoprotector Pigment Control FPS50+ DMX 50mL', 'DMX', '50 mL/g', 445, 8.9, 2, 'FOTOPROTECTORES'),
  ('CAT-120', 'HA 3.5% DMX 10mL (Dermapen)', 'DMX', '10 mL/g', 490, 49, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-121', 'Cóctel control acné DMX 10mL', 'DMX', '10 mL/g', 300, 30, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-122', 'Coenzima Q10 DMX 10mL', 'DMX', '10 mL/g', 295, 29.5, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-123', 'Cóctel péptidos DMX 10mL', 'DMX', '10 mL/g', 320, 32, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-124', 'Vitamina C DMX 10mL', 'DMX', '10 mL/g', 255, 25.5, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-125', 'Glutatión DMX 10mL', 'DMX', '10 mL/g', 345, 34.5, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-126', 'PDRN DMX 10mL (Dermapen)', 'DMX', '10 mL/g', 550, 55, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-127', 'Ácido tranexámico DMX 10mL', 'DMX', '10 mL/g', 235, 23.5, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-128', 'Silicio orgánico DMX 10mL', 'DMX', '10 mL/g', 245, 24.5, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-129', 'Cóctel nutritivo capilar DMX 10mL', 'DMX', '10 mL/g', 320, 32, 2, 'MESOTERAPIA DERMAPEN'),
  ('CAT-150', 'Gasas estériles 5x5 cm (caja 100pzs)', 'Médico', '100 pzs', 120, 1.2, 2, 'CONSUMIBLES'),
  ('CAT-151', 'Gasas no estériles 10x10 cm (paquete 100pzs)', 'Médico', '100 pzs', 80, 0.8, 2, 'CONSUMIBLES'),
  ('CAT-152', 'Torundas de algodón (bolsa 100pzs)', 'Médico', '100 pzs', 45, 0.45, 2, 'CONSUMIBLES'),
  ('CAT-153', 'Guantes de nitrilo (caja 100 pares)', 'Médico', '100 pzs', 320, 3.2, 2, 'CONSUMIBLES'),
  ('CAT-154', 'Solución alcanforada 500mL', 'Médico', '500 pzs', 80, 0.16, 2, 'CONSUMIBLES'),
  ('CAT-155', 'Microdacyn 60mL (heridas/acné)', 'Médico', '60 pzs', 180, 3, 2, 'CONSUMIBLES'),
  ('CAT-156', 'Lancetas desechables (caja 100pzs)', 'Médico', '100 pzs', 90, 0.9, 2, 'CONSUMIBLES'),
  ('CAT-157', 'Agujas mesoterapia 30G 4mm (caja 100pzs)', 'Médico', '100 pzs', 350, 3.5, 2, 'CONSUMIBLES'),
  ('CAT-158', 'Cánulas desechables (caja 20pzs)', 'Médico', '20 pzs', 680, 34, 2, 'CONSUMIBLES'),
  ('CAT-159', 'Jeringas 1mL sin aguja (caja 100pzs)', 'Médico', '100 pzs', 280, 2.8, 2, 'CONSUMIBLES'),
  ('CAT-160', 'Jeringas 3mL (caja 100pzs)', 'Médico', '100 pzs', 320, 3.2, 2, 'CONSUMIBLES'),
  ('CAT-161', 'Recipiente residuos biológicos 1L', 'Médico', '1 pzs', 95, 95, 2, 'CONSUMIBLES'),
  ('CAT-162', 'Cubre boca KN95 (caja 50pzs)', 'Médico', '50 pzs', 250, 5, 2, 'CONSUMIBLES'),
  ('CAT-163', 'Papel kraft / film para camilla (rollo)', 'Médico', '50000 pzs', 180, 0.0036, 2, 'CONSUMIBLES'),
  ('CAT-170', 'Aceite esencial lavanda 10mL', 'Otros', '10 mL/g', 150, 15, 2, 'AROMATERAPIA'),
  ('CAT-171', 'Aceite esencial romero 10mL', 'Otros', '10 mL/g', 120, 12, 2, 'AROMATERAPIA'),
  ('CAT-172', 'Cold cream / aceite masaje 250mL', 'Otros', '250 mL/g', 180, 0.72, 2, 'AROMATERAPIA')
ON CONFLICT (codigo) DO NOTHING;

-- ── Kits genéricos (10 protocolos del Excel) ──
INSERT INTO kits_insumos (nombre) VALUES
  ('LIMPIEZA FACIAL PROFUNDA'),
  ('DERMAPEN (Microneedling)'),
  ('HYDRAFACIAL'),
  ('PEELING QUÍMICO'),
  ('RADIOFRECUENCIA FACIAL'),
  ('BOTOX / TOXINA BOTULÍNICA'),
  ('RELLENO / ÁCIDO HIALURÓNICO'),
  ('SUEROTERAPIA / MEDICINA FUNCIONAL'),
  ('DEPILACIÓN LÁSER (LumiMax PL)'),
  ('HIFU (Ultrasonido microfocalizado)')
ON CONFLICT (nombre) DO NOTHING;

-- ── Recetas de insumos por kit (76 líneas) ──
-- sections found: BOTOX / TOXINA BOTULÍNICA, DEPILACIÓN LÁSER (LumiMax PL), DERMAPEN (Microneedling), HIFU (Ultrasonido microfocalizado), HYDRAFACIAL, LIMPIEZA FACIAL PROFUNDA, PEELING QUÍMICO, RADIOFRECUENCIA FACIAL, RELLENO / ÁCIDO HIALURÓNICO, SUEROTERAPIA / MEDICINA FUNCIONAL
INSERT INTO kit_insumo_items (kit_id, insumo_id, cantidad, unidad) VALUES
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-001'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-007'), 5, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-020'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-030'), 5, 'g'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-036'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-050'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-060'), 0.5, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-110'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-151'), 5, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-152'), 5, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-154'), 5, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 200, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-170'), 0.5, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA'), (SELECT id FROM insumos WHERE codigo = 'CAT-172'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-001'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-120'), 4, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-036'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-110'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-150'), 5, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-157'), 3, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 200, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-080'), 20, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-081'), 20, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-082'), 20, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-036'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-110'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 200, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-001'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-090'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-100'), 5, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-020'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-036'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-110'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-150'), 5, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 200, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RADIOFRECUENCIA FACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-073'), 10, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RADIOFRECUENCIA FACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-020'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RADIOFRECUENCIA FACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-050'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RADIOFRECUENCIA FACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-110'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RADIOFRECUENCIA FACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RADIOFRECUENCIA FACIAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 200, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA'), (SELECT id FROM insumos WHERE codigo = 'CAT-001'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA'), (SELECT id FROM insumos WHERE codigo = 'CAT-150'), 10, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA'), (SELECT id FROM insumos WHERE codigo = 'CAT-152'), 10, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA'), (SELECT id FROM insumos WHERE codigo = 'CAT-159'), 2, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 100, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA'), (SELECT id FROM insumos WHERE codigo = 'CAT-155'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-001'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-150'), 8, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-152'), 8, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-158'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-160'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-155'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 100, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'SUEROTERAPIA / MEDICINA FUNCIONAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-150'), 5, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'SUEROTERAPIA / MEDICINA FUNCIONAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-152'), 5, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'SUEROTERAPIA / MEDICINA FUNCIONAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'SUEROTERAPIA / MEDICINA FUNCIONAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-160'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'SUEROTERAPIA / MEDICINA FUNCIONAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-157'), 1, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'SUEROTERAPIA / MEDICINA FUNCIONAL'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 100, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DEPILACIÓN LÁSER (LumiMax PL)'), (SELECT id FROM insumos WHERE codigo = 'CAT-072'), 15, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DEPILACIÓN LÁSER (LumiMax PL)'), (SELECT id FROM insumos WHERE codigo = 'CAT-110'), 3, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DEPILACIÓN LÁSER (LumiMax PL)'), (SELECT id FROM insumos WHERE codigo = 'CAT-152'), 5, 'pieza'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DEPILACIÓN LÁSER (LumiMax PL)'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'DEPILACIÓN LÁSER (LumiMax PL)'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 200, 'cm'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HIFU (Ultrasonido microfocalizado)'), (SELECT id FROM insumos WHERE codigo = 'CAT-071'), 15, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HIFU (Ultrasonido microfocalizado)'), (SELECT id FROM insumos WHERE codigo = 'CAT-050'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HIFU (Ultrasonido microfocalizado)'), (SELECT id FROM insumos WHERE codigo = 'CAT-110'), 2, 'mL'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HIFU (Ultrasonido microfocalizado)'), (SELECT id FROM insumos WHERE codigo = 'CAT-153'), 1, 'par'),
  ((SELECT id FROM kits_insumos WHERE nombre = 'HIFU (Ultrasonido microfocalizado)'), (SELECT id FROM insumos WHERE codigo = 'CAT-163'), 200, 'cm');

-- ── Mapeo obvio kit → tratamiento real (por nombre o subcategoría exacta) ──
INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'LIMPIEZA FACIAL PROFUNDA')
FROM tratamientos t WHERE t.nombre = 'Limpieza facial profunda'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'DERMAPEN (Microneedling)')
FROM tratamientos t WHERE t.subcategoria = 'Dermapen · Microneedling'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'HYDRAFACIAL')
FROM tratamientos t WHERE t.nombre = 'Hydrafacial'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'PEELING QUÍMICO')
FROM tratamientos t WHERE t.subcategoria = 'Peelings'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'RADIOFRECUENCIA FACIAL')
FROM tratamientos t
WHERE t.subcategoria IN ('Radiofrecuencia Fraccionada', 'Radiofrecuencia Monopolar')
  AND t.nombre ILIKE '%facial%'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'BOTOX / TOXINA BOTULÍNICA')
FROM tratamientos t WHERE t.subcategoria = 'Toxina Botulínica / Botox'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'RELLENO / ÁCIDO HIALURÓNICO')
FROM tratamientos t WHERE t.subcategoria = 'Ácido Hialurónico'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'SUEROTERAPIA / MEDICINA FUNCIONAL')
FROM tratamientos t WHERE t.subcategoria ILIKE 'Sueroterapia%'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'DEPILACIÓN LÁSER (LumiMax PL)')
FROM tratamientos t WHERE t.subcategoria = 'Depilación Láser'
ON CONFLICT (tratamiento_id) DO NOTHING;

INSERT INTO tratamiento_kit (tratamiento_id, kit_id)
SELECT t.id, (SELECT id FROM kits_insumos WHERE nombre = 'HIFU (Ultrasonido microfocalizado)')
FROM tratamientos t WHERE t.subcategoria = 'HIFU · Ultrasonido Microfocado'
ON CONFLICT (tratamiento_id) DO NOTHING;

-- ── Egresos fijos mensuales (Junio 2026, $21,536 total) ──
INSERT INTO movimientos (tipo, categoria_id, concepto, monto, fecha, notas) VALUES
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Renta'),     'Renta del local',                          15000, '2026-06-01', 'Pago mensual'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Luz / electricidad',                       2281,  '2026-06-01', 'CFE'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Agua',                                     150,   '2026-06-01', 'SAPAM'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Internet',                                 580,   '2026-06-01', 'Proveedor internet'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Teléfono',                                 450,   '2026-06-01', 'Servicio móvil'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Seguridad',                                400,   '2026-06-01', 'Alarma / vigilancia'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Mantenimiento',                            1000,  '2026-06-01', 'Instalaciones'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Limpieza',                                 300,   '2026-06-01', 'Servicio limpieza'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Papelería',                                800,   '2026-06-01', 'Insumos administrativos'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Servicio de café / atención a pacientes',  200,   '2026-06-01', 'Café, agua, amenidades'),
  ('egreso', (SELECT id FROM categorias_movimiento WHERE nombre = 'Servicios'), 'Recipientes residuos biológicos',         375,   '2026-06-01', 'Empresa autorizada SEMARNAT');
