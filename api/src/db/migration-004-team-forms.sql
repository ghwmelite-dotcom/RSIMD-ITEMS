-- Additive storage for offline team workbook evidence.
CREATE TABLE IF NOT EXISTS team_forms (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  team TEXT NOT NULL,
  payload TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES technicians(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_team_forms_period ON team_forms(year, quarter);

CREATE TABLE IF NOT EXISTS team_form_observations (
  observation_key TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES team_forms(id)
);
CREATE INDEX IF NOT EXISTS idx_team_form_observations_form ON team_form_observations(form_id);
