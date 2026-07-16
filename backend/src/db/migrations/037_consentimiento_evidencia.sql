-- Evidencia de firma por norma: IP, navegador, geolocalización e INE (ambas caras)
ALTER TABLE consentimientos_firmados
  ADD COLUMN IF NOT EXISTS ip              INET,
  ADD COLUMN IF NOT EXISTS user_agent      TEXT,
  ADD COLUMN IF NOT EXISTS geo_lat         NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS geo_lng         NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS geo_precision_m NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS ine_frente      TEXT,
  ADD COLUMN IF NOT EXISTS ine_reverso     TEXT;
