CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  org_entity_id TEXT NOT NULL REFERENCES org_entities(id),
  rooms TEXT DEFAULT '[]',
  assigned_technicians TEXT DEFAULT '[]',
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_by TEXT REFERENCES technicians(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedules(date);
