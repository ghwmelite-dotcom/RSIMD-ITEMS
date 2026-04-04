# Phase 6: Admin Panel Enhancements — Design Specification

**Date:** 2026-04-04
**Status:** Approved

---

## 1. Technician Workload View

### API
New endpoint: `GET /api/dashboard/workload?year=&quarter=`
- Returns `{technicians: [{id, name, total, by_type: Record<string, number>, entities: string[]}]}`
- Queries: GROUP BY technician_id with JOIN technicians, sub-query for distinct org_entity codes

### Frontend
New component `TechnicianWorkload.tsx` as a new tab in AdminPage:
- Horizontal bar chart (Recharts) showing log count per technician
- Table below with: name, total logs, routine/corrective/emergency breakdown, entities covered

---

## 2. Audit Log

### Schema
```sql
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
```

### API
- New helper: `logAudit(db, {actor_id, actor_name, action, resource_type, resource_id, details})` — called in route handlers after mutations
- Add audit logging to: org-entities (create/update/delete), equipment (create/update/delete), technicians (create/update), categories (create/update), reports (generate)
- New endpoint: `GET /api/audit-log?limit=50&offset=0` — admin only, returns recent audit entries

### Frontend
New tab "Audit Log" in AdminPage (admin only):
- Table: timestamp, actor, action, resource type, resource ID, details
- Auto-refreshes, shows most recent first

---

## 3. Bulk Equipment Import

### API
New endpoint: `POST /api/equipment/bulk-import` — admin only
- Accepts JSON body `{items: [{type, make, model, ...}]}`
- Validates each item: required fields, valid type enum, org_entity_id exists
- Inserts valid items, returns `{imported: number, errors: [{row, message}]}`

### Frontend
New component `BulkImport.tsx` in admin:
- File input accepting .csv
- Client-side CSV parsing (split lines, map columns)
- Preview table of parsed rows with validation status
- "Import" button sends to API
- Results: imported count + error list

---

## File Structure

### API
| File | Change |
|------|--------|
| `api/src/db/migration-002.sql` | Create audit_log table |
| `api/src/db/schema.sql` | Add audit_log for fresh installs |
| `api/src/db/audit.ts` | Audit logging helper |
| `api/src/routes/audit.ts` | Audit log list endpoint |
| `api/src/routes/dashboard.ts` | Add workload endpoint |
| `api/src/routes/equipment.ts` | Add bulk-import endpoint, add audit calls |
| `api/src/routes/org-entities.ts` | Add audit calls |
| `api/src/routes/technicians.ts` | Add audit calls |
| `api/src/routes/categories.ts` | Add audit calls |
| `api/src/services/aggregator.ts` | Add workload query |
| `api/src/router.ts` | Add new routes |

### Frontend
| File | Change |
|------|--------|
| `web/src/components/admin/TechnicianWorkload.tsx` | New — workload chart + table |
| `web/src/components/admin/AuditLog.tsx` | New — audit log viewer |
| `web/src/components/admin/BulkImport.tsx` | New — CSV import UI |
| `web/src/pages/AdminPage.tsx` | Add 3 new tabs |
