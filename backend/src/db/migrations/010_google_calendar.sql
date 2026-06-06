ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS citas_google_event_id_idx
  ON citas (google_event_id)
  WHERE google_event_id IS NOT NULL;
