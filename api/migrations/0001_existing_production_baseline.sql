-- Historical migrations 001-004 are already applied. Do not replay them.
-- These read-only probes fail if a required legacy table/column is absent.
-- Wrangler records this file in d1_migrations only after success.
SELECT id, code, rooms, is_active FROM org_entities LIMIT 0;
SELECT id, asset_tag, os_version, processor_gen FROM equipment LIMIT 0;
SELECT id, name FROM maintenance_categories LIMIT 0;
SELECT id, password_hash, role, is_active FROM technicians LIMIT 0;
SELECT id, photo_urls, year, quarter, logged_date FROM maintenance_logs LIMIT 0;
SELECT id, quarter, year, generation_log FROM reports LIMIT 0;
SELECT id, report_id FROM report_items LIMIT 0;
SELECT id, actor_id FROM audit_log LIMIT 0;
SELECT id, assigned_technicians, date FROM schedules LIMIT 0;
SELECT id, year, quarter, team, payload, content_hash, uploaded_by, created_at FROM team_forms LIMIT 0;
SELECT observation_key, form_id FROM team_form_observations LIMIT 0;
