ALTER TABLE technicians ADD COLUMN staff_id TEXT;
ALTER TABLE technicians ADD COLUMN staff_category TEXT NOT NULL DEFAULT 'technician';
ALTER TABLE technicians ADD COLUMN must_change_pin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE technicians ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_technicians_staff_id ON technicians(staff_id);
CREATE TABLE auth_login_limits (limit_key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL);
