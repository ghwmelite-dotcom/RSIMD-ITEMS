---
id: PRD-001
title: "RSIMD-ITEMS — OHCS IT Equipment Maintenance Management System"
status: draft
author: Osborne Hodges (RSIMD)
created: 2026-04-03
owner: Hodges & Co. Limited / RSIMD, OHCS
---

# RSIMD-ITEMS — Product Requirements Document

## 1. Problem Statement

The Research, Statistics & Information Management Directorate (RSIMD) at Ghana's Office of the Head of Civil Service (OHCS) currently manages quarterly IT equipment maintenance using manual processes — Word documents, verbal reports, and memory-based tracking. This creates several pain points:

- **Manual report compilation**: At each quarter-end, IT technicians must manually recall and compile all maintenance activities across 5 directorates and 5+ units into a structured Word document with tables, monthly breakdowns, and narrative sections.
- **No equipment registry**: There is no centralized database of IT assets (desktops, printers, routers, CCTV cameras, scanners) — technicians rely on room numbers and memory.
- **No historical tracking**: Recurring issues (e.g., Room 24 Council's persistent internet connectivity problems) are noticed anecdotally, not detected systematically.
- **No real-time visibility**: Management only sees maintenance status at quarter-end, not in real time.
- **Paper-dependent workflow**: Maintenance activities are logged informally, making data loss common and auditing impossible.

## 2. Target Users

| Role | Description | Primary needs |
|------|-------------|---------------|
| IT Technician | RSIMD staff who perform maintenance across OHCS | Quick logging from phone, offline capability, scan-to-log |
| IT Unit Lead | Senior technician / RSIMD coordinator | Dashboard overview, report generation, team assignment |
| Director (RSIMD) | Approves and signs quarterly reports | One-click report generation, trend visibility |
| Management | OHCS leadership / Chief Director | Real-time status per directorate/unit, quarterly summaries |

## 3. OHCS Organizational Structure

The system must model OHCS's actual hierarchy with flexibility for future changes.

### Directorates (5)
- **F&A** — Finance & Administration
- **RTDD** — Research, Training & Development Directorate
- **CMD** — Conditions of Service, Manpower & Development
- **PBMED** — Performance, Benefits, Monitoring & Evaluation Directorate
- **RSIMD** — Research, Statistics & Information Management Directorate

### Units (5+, extensible)
- Council
- Estate
- Accounts
- Internal Audit
- Reform Coordinating Unit
- Chief Director's Secretariat (type: secretariat)

### Data model
A single `org_entities` table with a `type` enum (`directorate | unit | secretariat`) allows adding new entities without code changes. Each entity has associated room numbers stored as a JSON array.

## 4. Maintenance Types

Mapped directly from OHCS's established methodology:

1. **Condition-based servicing and monitoring** — Evaluates actual condition of equipment to determine needed actions (e.g., software licensing audits).
2. **Routine maintenance** — Regular scheduled inspection and servicing (network checks, software updates, cable testing, security protocols, workstation assessments).
3. **Corrective maintenance** — Performed after failure detection to restore systems (e.g., network connectivity restoration, hardware/software reinstallation).
4. **Emergency maintenance** — Immediate intervention for imminent system threats (e.g., faulty desktop PCs, critical printer failures).
5. **Predictive maintenance** — Assesses equipment condition to predict maintenance needs (e.g., blocking unauthorized websites, advising on equipment care).

## 5. Maintenance Categories (Issue Types)

Extensible list matching current report line items:

- Internet connection
- AD/Active Directory authentication
- MS Office installation
- Ethernet cable installation
- Internet cable re-termination
- Printer connection/re-configuration
- Ethernet cable replacement
- Network connectivity (general)
- Hardware installation
- Software installation
- Router configuration
- RAM capacity issues
- Faulty desktop PCs
- CCTV maintenance

New categories can be added at any time via admin panel without code changes.

## 6. Core Features

### 6.1 Equipment Registry & QR Asset Tags
- Register all IT equipment with: type, make/model, processor, serial number, assigned org_entity, room number, installation date, current status.
- Generate printable QR code stickers per asset.
- Scanning a QR code with phone camera opens the asset's maintenance form pre-populated with device info, location, and full service history.

### 6.2 Maintenance Logging (Mobile-First)
- Mobile-optimized Progressive Web App (PWA).
- Technician selects or scans equipment, picks maintenance type and category, writes description and resolution, submits.
- Works fully offline — logs queue locally and sync when connectivity returns.
- Attach photos of issues or completed work (stored in R2).
- Auto-captures: date, time, technician ID, quarter, month.

### 6.3 Automated Quarterly Report Generation
- One-click generation of the quarterly DOCX report matching OHCS's exact format:
  - Cover page: RSIMD header, quarter title, date range
  - Table of Contents
  - 1.0 Introduction (AI-generated narrative using actual data)
  - 1.1 Objectives
  - 2.0 Methodology
  - 3.0 Details of Maintenance and Servicing
    - 3.1 Condition-based (narrative + findings)
    - 3.2 Routine maintenance (monthly breakdown table: item × month × total)
    - 3.3 Corrective maintenance (summary table + directorate/room breakdown)
    - 3.4 Emergency maintenance (monthly breakdown table)
    - 3.5 Predictive maintenance (narrative)
  - 4.0 Challenges (AI-generated from flagged issues)
  - 5.0 Recommendations (AI-generated from data patterns)
  - 6.0 Conclusion (AI-generated summary)
- AI narratives generated via Cloudflare Workers AI (Llama 3.1 70B).
- Tables populated directly from D1 aggregation queries.
- Generated DOCX stored in R2 with versioning.

### 6.4 Analytics Dashboard
- Real-time overview: total maintenance activities this quarter, broken down by type.
- Per-directorate/unit breakdown with drill-down.
- Monthly trend charts (Recharts).
- Top issue categories ranked.
- Equipment health scores per org entity.
- Technician workload distribution.
- Quarter-over-quarter comparison.

### 6.5 Predictive Intelligence
- Pattern detection: identify equipment or locations with recurring issues.
- Aging alerts: flag Pentium-class or outdated machines for replacement.
- Seasonal trends: correlate maintenance spikes with time periods.
- Powered by Workers AI embeddings for semantic search over historical logs.

### 6.6 Admin Panel
- CRUD for org entities (add/remove directorates, units, secretariats).
- CRUD for equipment registry.
- Manage maintenance categories (add new issue types).
- Manage technician accounts and directorate assignments.
- Configure report templates and AI prompt parameters.

## 7. Technical Architecture

### Stack
| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React 18 + TypeScript + Vite | Developer's primary stack, excellent PWA support |
| API | Cloudflare Workers | Edge-native, zero cold start, same platform as storage |
| Database | Cloudflare D1 (SQLite) | Relational data, complex aggregation queries for reports |
| Cache | Cloudflare KV | Auth sessions, config, cached dashboard aggregations |
| File storage | Cloudflare R2 | Generated DOCX reports, equipment photos, QR assets |
| Realtime | Durable Objects | Offline sync reconciliation, live dashboard updates |
| AI | Cloudflare Workers AI | Llama 3.1 70B for narratives, BGE embeddings for search |
| Report gen | docx (npm) | Programmatic DOCX creation matching OHCS format |
| QR codes | qrcode (npm) | Client-side QR generation for asset tags |
| Charts | Recharts | React-native charting for dashboard |

### D1 Schema (Core Tables)

```sql
-- Organizational entities (directorates, units, secretariats)
CREATE TABLE org_entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('directorate', 'unit', 'secretariat')),
  rooms TEXT DEFAULT '[]',  -- JSON array of room numbers
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- IT equipment registry
CREATE TABLE equipment (
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Maintenance categories (extensible)
CREATE TABLE maintenance_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT 1
);

-- Maintenance activity logs
CREATE TABLE maintenance_logs (
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
  photo_urls TEXT DEFAULT '[]',  -- JSON array of R2 URLs
  logged_date TEXT NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  synced_at TEXT,  -- NULL if created offline and not yet synced
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- IT technicians
CREATE TABLE technicians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'technician',
  email TEXT,
  phone TEXT,
  assigned_entities TEXT DEFAULT '[]',  -- JSON array of org_entity_ids
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Generated reports
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  quarter INTEGER NOT NULL,
  year INTEGER NOT NULL,
  file_url TEXT,  -- R2 URL
  file_size INTEGER,
  generated_by TEXT REFERENCES technicians(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'reviewed', 'approved')),
  ai_model TEXT,
  generation_log TEXT,  -- JSON log of AI generation steps
  created_at TEXT DEFAULT (datetime('now'))
);

-- Challenges and recommendations (per report)
CREATE TABLE report_items (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id),
  type TEXT NOT NULL CHECK (type IN ('challenge', 'recommendation')),
  description TEXT NOT NULL,
  category TEXT,  -- procurement, licensing, infrastructure, staffing
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Offline sync queue
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  payload TEXT NOT NULL,  -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT
);
```

### Seed Data

```sql
-- Directorates
INSERT INTO org_entities (id, name, code, type, rooms) VALUES
  ('dir-fa', 'Finance & Administration', 'F&A', 'directorate', '["38","39"]'),
  ('dir-rtdd', 'Research, Training & Development Directorate', 'RTDD', 'directorate', '["08","09"]'),
  ('dir-cmd', 'Conditions of Service, Manpower & Development', 'CMD', 'directorate', '["33"]'),
  ('dir-pbmed', 'Performance, Benefits, Monitoring & Evaluation Directorate', 'PBMED', 'directorate', '["32"]'),
  ('dir-rsimd', 'Research, Statistics & Information Management Directorate', 'RSIMD', 'directorate', '[]');

-- Units
INSERT INTO org_entities (id, name, code, type, rooms) VALUES
  ('unit-council', 'Council', 'COUNCIL', 'unit', '["24"]'),
  ('unit-estate', 'Estate', 'ESTATE', 'unit', '[]'),
  ('unit-accounts', 'Accounts', 'ACCOUNTS', 'unit', '[]'),
  ('unit-audit', 'Internal Audit', 'AUDIT', 'unit', '[]'),
  ('unit-rcu', 'Reform Coordinating Unit', 'RCU', 'unit', '[]');

-- Secretariat
INSERT INTO org_entities (id, name, code, type, rooms) VALUES
  ('sec-cd', 'Chief Director''s Secretariat', 'CD-SEC', 'secretariat', '["14"]');

-- Default maintenance categories
INSERT INTO maintenance_categories (id, name, description) VALUES
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
```

### API Routes

```
Auth
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/me

Org Entities
  GET    /api/org-entities
  GET    /api/org-entities/:id
  POST   /api/org-entities
  PUT    /api/org-entities/:id
  DELETE /api/org-entities/:id

Equipment
  GET    /api/equipment
  GET    /api/equipment/:id
  GET    /api/equipment/by-tag/:assetTag
  GET    /api/equipment/by-entity/:entityId
  POST   /api/equipment
  PUT    /api/equipment/:id
  DELETE /api/equipment/:id

Maintenance Logs
  GET    /api/maintenance
  GET    /api/maintenance/:id
  GET    /api/maintenance/by-quarter/:year/:quarter
  GET    /api/maintenance/by-entity/:entityId
  GET    /api/maintenance/by-equipment/:equipmentId
  POST   /api/maintenance
  PUT    /api/maintenance/:id
  POST   /api/maintenance/bulk-sync   (offline sync)

Categories
  GET    /api/categories
  POST   /api/categories
  PUT    /api/categories/:id

Reports
  GET    /api/reports
  GET    /api/reports/:id
  POST   /api/reports/generate/:year/:quarter
  GET    /api/reports/:id/download

Dashboard
  GET    /api/dashboard/summary/:year/:quarter
  GET    /api/dashboard/trends/:year
  GET    /api/dashboard/entity-breakdown/:year/:quarter
  GET    /api/dashboard/predictions

Technicians
  GET    /api/technicians
  POST   /api/technicians
  PUT    /api/technicians/:id
```

## 8. Report Generation Flow

```
1. User clicks "Generate Q4 2024 Report"
2. Worker queries D1:
   - Aggregate routine maintenance by category × month
   - Aggregate corrective maintenance by org_entity + room
   - Aggregate emergency maintenance by category × month
   - Count totals per maintenance type
   - Fetch flagged challenges and recommendations
3. Worker calls Workers AI (Llama 3.1 70B) with structured prompt:
   - System: "You are writing a formal quarterly IT maintenance report for OHCS Ghana..."
   - User: JSON payload with all aggregated data
   - Generates: Introduction, methodology descriptions, per-section narratives, challenges, recommendations, conclusion
4. Worker assembles DOCX using docx-js:
   - OHCS/RSIMD letterhead
   - Table of Contents
   - All 6 sections with tables + AI narratives
5. DOCX buffer uploaded to R2
6. Report record saved to D1 with R2 URL
7. User downloads from dashboard
```

## 9. Offline-First Architecture

```
Service Worker (sw.js)
├── Cache: App shell (HTML, CSS, JS, icons)
├── Cache: API responses (org entities, equipment, categories)
├── IndexedDB: Pending maintenance logs (not yet synced)
└── Background Sync: Queue → POST /api/maintenance/bulk-sync

Flow:
1. Technician opens PWA (cached app shell loads instantly)
2. Scans QR / selects equipment (cached equipment data)
3. Logs maintenance → saved to IndexedDB
4. When online → Background Sync pushes to Worker → D1
5. Conflict resolution: last-write-wins with timestamp comparison
```

## 10. Non-Functional Requirements

- **Performance**: Dashboard loads in < 2s on 3G connection (KV-cached aggregations).
- **Offline**: Full maintenance logging capability without internet.
- **Security**: Token-based auth stored in KV. Role-based access (technician, lead, admin).
- **Scalability**: The system handles 10-50 concurrent users (OHCS staff). D1 handles this comfortably.
- **Accessibility**: WCAG 2.1 AA. Works on low-end Android phones (common in Ghana government).
- **Branding**: Ghana national colors (red, gold, green, black) in UI accents. OHCS logo integration.
- **Data backup**: Quarterly R2 exports as additional backup.

## 11. Success Metrics

- Report generation time: from ~2 weeks manual → < 5 minutes automated.
- Data completeness: 100% of maintenance activities logged (vs. estimated 60-70% recall currently).
- Mean time to detect recurring issues: from quarter-end review → real-time dashboard alerts.
- Technician satisfaction: reduced paperwork burden.

## 12. Phased Delivery

### Phase 1 — Foundation (Epic 001)
- Cloudflare Worker API scaffolding with D1 schema
- Auth (simple token-based)
- Org entity CRUD
- Equipment CRUD
- Basic React app shell with routing

### Phase 2 — Core Logging (Epic 002)
- Maintenance log CRUD API
- Mobile-optimized logging form
- QR code generation for asset tags
- QR scan-to-log flow (camera API)
- Category management

### Phase 3 — Auto Reports (Epic 003)
- D1 aggregation queries for all report sections
- Workers AI integration for narrative generation
- DOCX assembly with docx-js matching OHCS format
- R2 upload and download flow
- Report history and versioning

### Phase 4 — Dashboard & Intelligence (Epic 004)
- Analytics dashboard with Recharts
- Per-entity drill-down views
- Trend analysis and predictions
- Quarter comparison
- Technician workload view

### Phase 5 — Offline & PWA (Epic 005)
- Service worker with app shell caching
- IndexedDB for offline log storage
- Background sync implementation
- PWA manifest and installability
- Conflict resolution logic

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Workers AI model quality for formal government prose | Medium | High | Fine-tune prompts extensively; allow manual editing of generated narratives before final DOCX |
| Low smartphone adoption among some OHCS staff | Medium | Medium | System also works on desktop; QR scanning is optional (manual equipment selection available) |
| D1 query complexity for aggregation reports | Low | Medium | Pre-compute and cache quarterly aggregations in KV on each new log entry |
| Internet reliability at OHCS | High | High | Offline-first architecture is Phase 5; prioritize this if internet issues are blocking |
| Resistance to new workflow | Medium | High | Start with RSIMD as pilot directorate; demonstrate report generation value to leadership |

## 14. Future Enhancements (Post-MVP)

- WhatsApp/SMS notifications via Twilio for maintenance reminders
- Barcode scanning for equipment without QR tags
- Integration with Ghana government procurement systems
- Multi-branch support (if OHCS expands to regional offices)
- Technician performance analytics
- Equipment lifecycle cost tracking
- Spare parts inventory management
