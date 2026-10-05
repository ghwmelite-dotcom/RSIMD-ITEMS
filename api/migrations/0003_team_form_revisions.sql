CREATE TABLE IF NOT EXISTS team_form_revisions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES team_forms(id),
  payload TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  revised_by TEXT NOT NULL REFERENCES technicians(id),
  revised_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_team_form_revisions_form ON team_form_revisions(form_id);
