-- Agregar columnas categoria y subcategoria
ALTER TABLE tratamientos
  ADD COLUMN IF NOT EXISTS categoria    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(150),
  ADD COLUMN IF NOT EXISTS orden        INTEGER DEFAULT 0;

-- Limpiar servicios anteriores (no hay citas reales aún en producción)
DELETE FROM tratamientos;

-- ─────────────────────────────────────────────
-- 00 · CITAS DE VALORACIÓN
-- ─────────────────────────────────────────────
INSERT INTO tratamientos (nombre, duracion_min, categoria, subcategoria, orden) VALUES
  ('Valoración facial',                    60,  '00 · Citas de Valoración', NULL, 1),
  ('Valoración corporal',                  60,  '00 · Citas de Valoración', NULL, 2),
  ('Valoración capilar',                   60,  '00 · Citas de Valoración', NULL, 3),
  ('Valoración funcional',                 60,  '00 · Citas de Valoración', NULL, 4),
  ('Test epigenético',                     60,  '00 · Citas de Valoración', NULL, 5),
  ('Cita de seguimiento',                  30,  '00 · Citas de Valoración', NULL, 6),
  ('Anticipo para reservar cita',          15,  '00 · Citas de Valoración', NULL, 7),

-- ─────────────────────────────────────────────
-- 01 · MEDICINA ESTÉTICA · Botox
-- ─────────────────────────────────────────────
  ('Botox tercio superior',                30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 10),
  ('Botox full face',                      45,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 11),
  ('Baby botox · 30 U',                    30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 12),
  ('Mesobotox',                            45,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 13),
  ('Botox en masetero',                    30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 14),
  ('Botox en trapecio',                    30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 15),
  ('Botox en cuello',                      30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 16),
  ('Botox para hiperhidrosis · por zona',  30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 17),
  ('Botox auxiliar en migraña',            30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 18),
  ('Botox en zonas específicas',           30,  '01 · Medicina Estética', 'Toxina Botulínica / Botox', 19),

-- 01 · Ácido Hialurónico
  ('Relleno de labios',                    45,  '01 · Medicina Estética', 'Ácido Hialurónico', 20),
  ('Rinomodelación',                       45,  '01 · Medicina Estética', 'Ácido Hialurónico', 21),
  ('Armonización facial',                  60,  '01 · Medicina Estética', 'Ácido Hialurónico', 22),
  ('Relleno de ojera',                     45,  '01 · Medicina Estética', 'Ácido Hialurónico', 23),
  ('Relleno de pómulo',                    45,  '01 · Medicina Estética', 'Ácido Hialurónico', 24),
  ('Surco nasogeniano',                    45,  '01 · Medicina Estética', 'Ácido Hialurónico', 25),
  ('Marcaje mandibular',                   45,  '01 · Medicina Estética', 'Ácido Hialurónico', 26),
  ('Relleno de mentón',                    45,  '01 · Medicina Estética', 'Ácido Hialurónico', 27),
  ('Relleno de fosa temporal',             45,  '01 · Medicina Estética', 'Ácido Hialurónico', 28),

-- 01 · Skin Boosters
  ('PDRN Salmón · ReMedium',              60,  '01 · Medicina Estética', 'Skin Boosters', 30),
  ('TKN HA3',                              60,  '01 · Medicina Estética', 'Skin Boosters', 31),
  ('NCTF',                                 60,  '01 · Medicina Estética', 'Skin Boosters', 32),
  ('Exosomas NXO',                         60,  '01 · Medicina Estética', 'Skin Boosters', 33),

-- 01 · Bioestimuladores
  ('Sculptra',                             60,  '01 · Medicina Estética', 'Bioestimuladores', 35),
  ('Radiesse',                             60,  '01 · Medicina Estética', 'Bioestimuladores', 36),
  ('Ultracol PDO',                         60,  '01 · Medicina Estética', 'Bioestimuladores', 37),
  ('Juvelook',                             60,  '01 · Medicina Estética', 'Bioestimuladores', 38),
  ('Juvelook Volume',                      60,  '01 · Medicina Estética', 'Bioestimuladores', 39),
  ('Colagenasa',                           45,  '01 · Medicina Estética', 'Bioestimuladores', 40),

-- ─────────────────────────────────────────────
-- 02 · TRATAMIENTOS FACIALES
-- ─────────────────────────────────────────────
  ('Hydrafacial',                          75,  '02 · Tratamientos Faciales', 'Limpieza e Hidratación Profunda', 50),
  ('Geneo',                                75,  '02 · Tratamientos Faciales', 'Limpieza e Hidratación Profunda', 51),

  ('Dermapen antienvejecimiento',          60,  '02 · Tratamientos Faciales', 'Dermapen · Microneedling', 55),
  ('Dermapen manchas y despigmentación',   60,  '02 · Tratamientos Faciales', 'Dermapen · Microneedling', 56),
  ('Dermapen cicatrices de acné',          60,  '02 · Tratamientos Faciales', 'Dermapen · Microneedling', 57),
  ('Dermapen calidad de piel general',     60,  '02 · Tratamientos Faciales', 'Dermapen · Microneedling', 58),

  ('Peeling monoácido',                    45,  '02 · Tratamientos Faciales', 'Peelings', 60),
  ('Peeling combinado',                    45,  '02 · Tratamientos Faciales', 'Peelings', 61),
  ('Peeling profundo TCA',                 60,  '02 · Tratamientos Faciales', 'Peelings', 62),
  ('Cosmelan',                             90,  '02 · Tratamientos Faciales', 'Peelings', 63),

  ('Mesoterapia facial Toskani',           45,  '02 · Tratamientos Faciales', 'Mesoterapia Facial', 65),

-- ─────────────────────────────────────────────
-- 03 · TRATAMIENTOS CAPILARES
-- ─────────────────────────────────────────────
  ('Tricoscopia digital + diagnóstico capilar', 60, '03 · Tratamientos Capilares', 'Diagnóstico Capilar', 70),

  ('Dermaheal HL',                         45,  '03 · Tratamientos Capilares', 'Mesoterapia Capilar', 72),
  ('DR.CYJ Hair Filler',                   45,  '03 · Tratamientos Capilares', 'Mesoterapia Capilar', 73),

  ('Dermapen cuero cabelludo',             60,  '03 · Tratamientos Capilares', 'Dermapen Capilar', 75),

  ('CTM capilar + Dutasterida · 3.5 M',   90,  '03 · Tratamientos Capilares', 'Células Madre Capilares', 77),
  ('CTM capilar + Dutasterida · 7 M',     90,  '03 · Tratamientos Capilares', 'Células Madre Capilares', 78),

  ('Implante capilar FUE',                240,  '03 · Tratamientos Capilares', 'Trasplante Capilar', 80),

-- ─────────────────────────────────────────────
-- 04 · CONTROL DE PESO
-- ─────────────────────────────────────────────
  ('Valoración inicial y diagnóstico · Control de peso', 60, '04 · Control de Peso', 'Programa Médico Tirzepatida', 85),
  ('Aplicación de Tirzepatida (Mounjaro)',  30, '04 · Control de Peso', 'Programa Médico Tirzepatida', 86),
  ('Consulta de seguimiento mensual',       30, '04 · Control de Peso', 'Programa Médico Tirzepatida', 87),

  ('Enzimas Gencell · kit 3 viales',       45, '04 · Control de Peso', 'Lipolíticos Inyectables', 89),
  ('Enzimas PB Serum',                     45, '04 · Control de Peso', 'Lipolíticos Inyectables', 90),
  ('Mesoterapia corporal lipolítica',      45, '04 · Control de Peso', 'Lipolíticos Inyectables', 91),

-- ─────────────────────────────────────────────
-- 05 · APARATOLOGÍA
-- ─────────────────────────────────────────────
-- Láser
  ('Láser depilación · Cara · 30 min',    30, '05 · Aparatología', 'Depilación Láser', 100),
  ('Láser depilación · Pierna completa',  90, '05 · Aparatología', 'Depilación Láser', 101),
  ('Láser depilación · Media pierna',     60, '05 · Aparatología', 'Depilación Láser', 102),
  ('Láser depilación · Bikini',           30, '05 · Aparatología', 'Depilación Láser', 103),
  ('Láser depilación · Brasileño',        45, '05 · Aparatología', 'Depilación Láser', 104),
  ('Láser depilación · Axila',            30, '05 · Aparatología', 'Depilación Láser', 105),
  ('Láser depilación · Brazo',            45, '05 · Aparatología', 'Depilación Láser', 106),
  ('Láser depilación · Espalda',          60, '05 · Aparatología', 'Depilación Láser', 107),
  ('Láser depilación · Pecho',            45, '05 · Aparatología', 'Depilación Láser', 108),
  ('Láser depilación · Abdomen',          45, '05 · Aparatología', 'Depilación Láser', 109),
  ('Láser depilación · Glúteo',           45, '05 · Aparatología', 'Depilación Láser', 110),
  ('Láser depilación · Paquete pierna + brasileño + axila', 120, '05 · Aparatología', 'Depilación Láser', 111),

-- HIFU
  ('HIFU · Cara, cuello y escote',        90, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 115),
  ('HIFU · Papada',                       45, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 116),
  ('HIFU · Tercio inferior',              60, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 117),
  ('HIFU · Brazos',                       60, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 118),
  ('HIFU · Abdomen',                      75, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 119),
  ('HIFU · Espalda',                      75, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 120),
  ('HIFU · Glúteo',                       60, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 121),
  ('HIFU · Chaparrera (costados)',         60, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 122),
  ('HIFU · Media pierna',                 60, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 123),
  ('HIFU · Pierna completa',              90, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 124),
  ('HIFU · Paquete dos zonas',           120, '05 · Aparatología', 'HIFU · Ultrasonido Microfocado', 125),

-- Endolift
  ('Endolift · Perfilamiento facial completo', 90, '05 · Aparatología', 'Endolift · Laser Lyse', 128),
  ('Endolift · Papada',                   60, '05 · Aparatología', 'Endolift · Laser Lyse', 129),
  ('Endolift · Párpado superior',         60, '05 · Aparatología', 'Endolift · Laser Lyse', 130),
  ('Endolift · Párpado inferior',         60, '05 · Aparatología', 'Endolift · Laser Lyse', 131),
  ('Endolift · Cicatrices de acné',       60, '05 · Aparatología', 'Endolift · Laser Lyse', 132),
  ('Endolift · Abdomen',                  75, '05 · Aparatología', 'Endolift · Laser Lyse', 133),
  ('Endolift · Espalda',                  75, '05 · Aparatología', 'Endolift · Laser Lyse', 134),
  ('Endolift · Brazos',                   60, '05 · Aparatología', 'Endolift · Laser Lyse', 135),
  ('Endolift · Cintura',                  60, '05 · Aparatología', 'Endolift · Laser Lyse', 136),
  ('Endolift · Chaparrera',               60, '05 · Aparatología', 'Endolift · Laser Lyse', 137),
  ('Endolift · Pierna completa',          90, '05 · Aparatología', 'Endolift · Laser Lyse', 138),

-- RF Fraccionada
  ('Radiofrecuencia fraccionada facial',  60, '05 · Aparatología', 'Radiofrecuencia Fraccionada', 140),
  ('Radiofrecuencia fraccionada corporal',75, '05 · Aparatología', 'Radiofrecuencia Fraccionada', 141),

-- RF Monopolar
  ('Radiofrecuencia monopolar facial',    60, '05 · Aparatología', 'Radiofrecuencia Monopolar', 143),
  ('Radiofrecuencia monopolar corporal',  75, '05 · Aparatología', 'Radiofrecuencia Monopolar', 144),

-- Presoterapia
  ('Presoterapia · 30 min',              30, '05 · Aparatología', 'Presoterapia', 146),

-- Interfermicra
  ('Interfermicra · 30 min',             30, '05 · Aparatología', 'Interfermicra · Electroestimulación', 148),

-- Liposonic
  ('Liposonic',                           60, '05 · Aparatología', 'Liposonic', 150),

-- Escleroterapia
  ('Escleroterapia · Media pierna',      60, '05 · Aparatología', 'Escleroterapia', 152),
  ('Escleroterapia · Pierna completa',   90, '05 · Aparatología', 'Escleroterapia', 153),

-- ─────────────────────────────────────────────
-- 06 · TRATAMIENTOS DE SPA
-- ─────────────────────────────────────────────
  ('Limpieza facial profunda',            60, '06 · Tratamientos de Spa', 'Faciales de Spa', 160),

  ('Masaje relajante · 50 min',          50, '06 · Tratamientos de Spa', 'Corporales de Spa', 162),
  ('Drenaje linfático manual',            60, '06 · Tratamientos de Spa', 'Corporales de Spa', 163),
  ('Maderoterapia',                       60, '06 · Tratamientos de Spa', 'Corporales de Spa', 164),

  ('Peeling corporal',                    60, '06 · Tratamientos de Spa', 'Peelings Corporales', 166),

  ('Pink Intimate',                       45, '06 · Tratamientos de Spa', 'Tratamientos Despigmentantes Íntimos', 168),

  ('Limpieza profunda corporal',          60, '06 · Tratamientos de Spa', 'Limpieza Profunda Corporal', 170),

-- ─────────────────────────────────────────────
-- 07 · MEDICINA REGENERATIVA
-- ─────────────────────────────────────────────
  ('Exocell · 3.5 millones',             60, '07 · Medicina Regenerativa', 'Fibroblastos Alogénicos · Gencell', 175),
  ('Exocell · 7 millones',               60, '07 · Medicina Regenerativa', 'Fibroblastos Alogénicos · Gencell', 176),
  ('Exocell · 14 millones',              60, '07 · Medicina Regenerativa', 'Fibroblastos Alogénicos · Gencell', 177),

-- ─────────────────────────────────────────────
-- 08 · MEDICINA FUNCIONAL
-- ─────────────────────────────────────────────
  ('Test epigenético · Medicina Funcional', 60, '08 · Medicina Funcional', 'Diagnóstico Funcional', 180),

  ('Power Serum · Protocolo estándar',   90, '08 · Medicina Funcional', 'Power Serum Gencell', 182),
  ('Power Serum + NAD+ Renew',           90, '08 · Medicina Funcional', 'Power Serum Gencell', 183),

  ('Cóctel de Myers',                    60, '08 · Medicina Funcional', 'Sueroterapia Esencial', 185),
  ('Suero vitamínico',                   60, '08 · Medicina Funcional', 'Sueroterapia Esencial', 186),
  ('Suero hidratante + electrolitos',    60, '08 · Medicina Funcional', 'Sueroterapia Esencial', 187),
  ('Suero anti-fatiga',                  60, '08 · Medicina Funcional', 'Sueroterapia Esencial', 188),

  ('Suero antioxidante maestro',         90, '08 · Medicina Funcional', 'Sueroterapia Premium', 190),
  ('Suero de belleza y cabello',         90, '08 · Medicina Funcional', 'Sueroterapia Premium', 191),
  ('Suero longevidad y anti-edad',       90, '08 · Medicina Funcional', 'Sueroterapia Premium', 192),
  ('Suero energía y rendimiento',        90, '08 · Medicina Funcional', 'Sueroterapia Premium', 193),

  ('Cóctel detox de metales pesados',    90, '08 · Medicina Funcional', 'Sueroterapia Funcional', 195),
  ('Cóctel cognitivo',                   90, '08 · Medicina Funcional', 'Sueroterapia Funcional', 196),
  ('Cóctel articular',                   90, '08 · Medicina Funcional', 'Sueroterapia Funcional', 197),
  ('Cóctel metabólico y control de peso',90, '08 · Medicina Funcional', 'Sueroterapia Funcional', 198),
  ('Cóctel anti-estrés y sueño',         90, '08 · Medicina Funcional', 'Sueroterapia Funcional', 199),
  ('Cóctel inmunológico',                90, '08 · Medicina Funcional', 'Sueroterapia Funcional', 200),

  ('Suplementación básica',              30, '08 · Medicina Funcional', 'Suplementación Personalizada', 202),
  ('Suplementación avanzada',            45, '08 · Medicina Funcional', 'Suplementación Personalizada', 203),
  ('Protocolo de longevidad personalizado', 60, '08 · Medicina Funcional', 'Suplementación Personalizada', 204)
ON CONFLICT (nombre) DO NOTHING;
