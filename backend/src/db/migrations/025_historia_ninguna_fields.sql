-- Migration 025: Agregar campos "Ninguna" a historias_clinicas
ALTER TABLE historias_clinicas
  ADD COLUMN IF NOT EXISTS app_ninguna      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS med_ninguno      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apnp_ninguna     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gineco_ninguna   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trat_prev_ninguno BOOLEAN NOT NULL DEFAULT false;
