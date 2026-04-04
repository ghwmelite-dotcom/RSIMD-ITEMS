-- OHCS Directorates
INSERT OR IGNORE INTO org_entities (id, name, code, type, rooms) VALUES
  ('dir-fa', 'Finance & Administration', 'F&A', 'directorate', '["38","39"]'),
  ('dir-rtdd', 'Research, Training & Development Directorate', 'RTDD', 'directorate', '["08","09"]'),
  ('dir-cmd', 'Conditions of Service, Manpower & Development', 'CMD', 'directorate', '["33"]'),
  ('dir-pbmed', 'Performance, Benefits, Monitoring & Evaluation Directorate', 'PBMED', 'directorate', '["32"]'),
  ('dir-rsimd', 'Research, Statistics & Information Management Directorate', 'RSIMD', 'directorate', '[]');

-- OHCS Units
INSERT OR IGNORE INTO org_entities (id, name, code, type, rooms) VALUES
  ('unit-council', 'Council', 'COUNCIL', 'unit', '["24"]'),
  ('unit-estate', 'Estate', 'ESTATE', 'unit', '[]'),
  ('unit-accounts', 'Accounts', 'ACCOUNTS', 'unit', '[]'),
  ('unit-audit', 'Internal Audit', 'AUDIT', 'unit', '[]'),
  ('unit-rcu', 'Reform Coordinating Unit', 'RCU', 'unit', '[]');

-- Secretariat
INSERT OR IGNORE INTO org_entities (id, name, code, type, rooms) VALUES
  ('sec-cd', 'Chief Director''s Secretariat', 'CD-SEC', 'secretariat', '["14"]');

-- Maintenance Categories
INSERT OR IGNORE INTO maintenance_categories (id, name, description) VALUES
  ('cat-internet', 'Internet connection', 'Internet connectivity setup and troubleshooting'),
  ('cat-ad', 'AD authentication', 'Active Directory login and authentication issues'),
  ('cat-office', 'MS Office installation', 'Microsoft Office suite installation and licensing'),
  ('cat-eth-install', 'Ethernet cable installation', 'New ethernet cable runs and installations'),
  ('cat-cable-reterm', 'Internet cable re-termination', 'Re-terminating damaged or faulty cable ends'),
  ('cat-printer', 'Printer connection', 'Printer setup, connection, and re-configuration'),
  ('cat-eth-replace', 'Ethernet cable replacement', 'Replacing damaged or degraded ethernet cables'),
  ('cat-network', 'Network connectivity', 'General network troubleshooting and restoration'),
  ('cat-hw-install', 'Hardware installation', 'Installing new hardware components'),
  ('cat-sw-install', 'Software installation', 'General software installation and configuration'),
  ('cat-router', 'Router configuration', 'Router setup and configuration'),
  ('cat-ram', 'RAM capacity issues', 'Memory upgrade or replacement'),
  ('cat-faulty-pc', 'Faulty desktop PCs', 'Desktop computer hardware failures'),
  ('cat-cctv', 'CCTV maintenance', 'Surveillance camera maintenance and configuration');

-- Default admin user (PIN: 1234)
INSERT OR IGNORE INTO technicians (id, name, role, email, phone, assigned_entities, is_active, password_hash) VALUES
  ('tech-admin', 'System Administrator', 'admin', 'admin@ohcs.gov.gh', '', '[]', 1, '$2a$10$pf10K/wlN7t3ZLWYweVU.eMUzs2VH.0vTUzxTmBaeOmc/Jh5NNOSK');
