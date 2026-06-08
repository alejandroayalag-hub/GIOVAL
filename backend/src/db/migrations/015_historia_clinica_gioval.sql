-- Migration 015: Expand pacientes + historias_clinicas al formato Gioval HC-01 / HC-02

-- ─── PACIENTES: campos adicionales ───────────────────────────────────────────
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS telefono_alterno   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS estado             VARCHAR(80),
  ADD COLUMN IF NOT EXISTS escolaridad        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS grupo_etnico       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contacto_emergencia    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS parentesco_emergencia  VARCHAR(80),
  ADD COLUMN IF NOT EXISTS telefono_emergencia    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS referido_por       VARCHAR(150);

-- ─── HISTORIAS CLÍNICAS: AHF nuevas casillas ─────────────────────────────────
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS ah_autoinmunes       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ah_psiquiatricas_fam BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ah_alergias_graves   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ah_alopecia_heredit  BOOLEAN NOT NULL DEFAULT false;

-- ─── HISTORIAS CLÍNICAS: Medicamentos actuales ───────────────────────────────
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS medicamentos_actuales JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS alergias_texto        TEXT;

-- ─── HISTORIAS CLÍNICAS: APNP ampliado ───────────────────────────────────────
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS ejercicio_tipo       TEXT,
  ADD COLUMN IF NOT EXISTS ejercicio_frecuencia TEXT,
  ADD COLUMN IF NOT EXISTS ejercicio_duracion   TEXT,
  ADD COLUMN IF NOT EXISTS ejercicio_intensidad TEXT,
  ADD COLUMN IF NOT EXISTS horas_sueno          TEXT,
  ADD COLUMN IF NOT EXISTS calidad_sueno        TEXT,
  ADD COLUMN IF NOT EXISTS nivel_estres         TEXT,
  ADD COLUMN IF NOT EXISTS tabaco               TEXT,
  ADD COLUMN IF NOT EXISTS alcohol              TEXT,
  ADD COLUMN IF NOT EXISTS otras_sustancias     TEXT;

-- ─── HISTORIAS CLÍNICAS: Motivo de consulta ampliado ─────────────────────────
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS mc_motivo_texto       TEXT,
  ADD COLUMN IF NOT EXISTS mc_manchas            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_flacidez_facial    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_perdida_volumen    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_cicatrices_acne    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_poros              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_textura            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_grasa_localizada   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_celulitis          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_perdida_peso       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_control_metabolico BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_alopecia           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_bienestar          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_armonizacion       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_depilacion         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_mejora_piel        BOOLEAN NOT NULL DEFAULT false;

-- ─── HISTORIAS CLÍNICAS: Exploración física adicional ────────────────────────
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS habitus_exterior      TEXT,
  ADD COLUMN IF NOT EXISTS lesiones_descripcion  TEXT,
  ADD COLUMN IF NOT EXISTS observaciones_generales TEXT;

-- ─── HISTORIAS CLÍNICAS: Tratamientos previos capilares / cirugías ───────────
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS trat_prev_capilares TEXT,
  ADD COLUMN IF NOT EXISTS cirugias_esteticas  TEXT;
