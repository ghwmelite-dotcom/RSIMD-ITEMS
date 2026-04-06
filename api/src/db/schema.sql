-- RSIMD-ITEMS D1 Schema

CREATE TABLE IF NOT EXISTS org_entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('directorate', 'unit', 'secretariat')),
  rooms TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  asset_tag TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('desktop', 'laptop', 'printer', 'scanner', 'router', 'switch', 'access_point', 'cctv', 'ups', 'other')),
  make TEXT,
  model TEXT,
  processor TEXT,
  serial_number TEXT,
  org_entity_id TEXT NOT NULL REFERENCES org_entities(id),
  room_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'faulty', 'decommissioned', 'under_repair')),
  installed_date TEXT,
  notes TEXT,
  os_version TEXT,
  processor_gen TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'technician' CHECK (role IN ('technician', 'lead', 'admin')),
  email TEXT,
  phone TEXT,
  assigned_entities TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id TEXT PRIMARY KEY,
  equipment_id TEXT REFERENCES equipment(id),
  technician_id TEXT NOT NULL REFERENCES technicians(id),
  org_entity_id TEXT NOT NULL REFERENCES org_entities(id),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('condition_based', 'routine', 'corrective', 'emergency', 'predictive')),
  category_id TEXT REFERENCES maintenance_categories(id),
  room_number TEXT,
  description TEXT NOT NULL,
  resolution TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'escalated')),
  photo_urls TEXT DEFAULT '[]',
  logged_date TEXT NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_offline INTEGER DEFAULT 0,
  synced_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  quarter INTEGER NOT NULL,
  year INTEGER NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  generated_by TEXT REFERENCES technicians(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'reviewed', 'approved')),
  ai_model TEXT,
  generation_log TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS report_items (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('challenge', 'recommendation')),
  description TEXT NOT NULL,
  category TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_generated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_equipment_org ON equipment(org_entity_id);
CREATE INDEX IF NOT EXISTS idx_equipment_tag ON equipment(asset_tag);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_logs_quarter ON maintenance_logs(year, quarter);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON maintenance_logs(org_entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_equipment ON maintenance_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_logs_type ON maintenance_logs(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_logs_category ON maintenance_logs(category_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON maintenance_logs(logged_date);
CREATE INDEX IF NOT EXISTS idx_reports_quarter ON reports(year, quarter);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
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
