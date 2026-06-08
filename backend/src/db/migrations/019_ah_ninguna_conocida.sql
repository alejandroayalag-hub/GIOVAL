ALTER TABLE historias_clinicas ADD COLUMN IF NOT EXISTS ah_ninguna_conocida BOOLEAN NOT NULL DEFAULT false;
