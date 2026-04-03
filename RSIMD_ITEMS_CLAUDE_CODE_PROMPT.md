# RSIMD-ITEMS — Complete Build Prompt for Claude Code

You are building **RSIMD-ITEMS**, a full-stack IT equipment maintenance management system for Ghana's Office of the Head of Civil Service (OHCS), built by the Research, Statistics & Information Management Directorate (RSIMD) IT team.

## Project Overview

RSIMD-ITEMS replaces manual Word document-based quarterly maintenance reporting with a digital system that:
1. Tracks all IT equipment across OHCS directorates and units
2. Logs every maintenance activity via mobile-first PWA with QR scan-to-log
3. Auto-generates the quarterly DOCX maintenance report (matching OHCS's exact format)
4. Provides a real-time analytics dashboard
5. Works offline for technicians in the field

## Tech Stack (strict — do not substitute)

- **API**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Cache/Sessions**: Cloudflare KV
- **File Storage**: Cloudflare R2 (reports, photos)
- **Realtime/Sync**: Cloudflare Durable Objects
- **AI**: Cloudflare Workers AI (`@cf/meta/llama-3.1-70b-instruct` for report narratives, `@cf/baai/bge-base-en-v1.5` for embeddings/search)
- **Frontend**: React 18 + TypeScript + Vite
- **Report Generation**: `docx` npm package (docx-js) for DOCX creation
- **QR Codes**: `qrcode` npm package
- **Charts**: Recharts
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **PWA**: Workbox for service worker

## Project Structure

```
rsimd-items/
├── api/                          # Cloudflare Worker backend
│   ├── src/
│   │   ├── index.ts              # Worker entry + router
│   │   ├── router.ts             # Route definitions
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── org-entities.ts
│   │   │   ├── equipment.ts
│   │   │   ├── maintenance.ts
│   │   │   ├── categories.ts
│   │   │   ├── technicians.ts
│   │   │   ├── reports.ts
│   │   │   └── dashboard.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Token validation
│   │   │   ├── cors.ts
│   │   │   └── error-handler.ts
│   │   ├── services/
│   │   │   ├── report-generator.ts   # DOCX assembly
│   │   │   ├── ai-narrator.ts        # Workers AI narrative generation
│   │   │   ├── aggregator.ts         # D1 query aggregations for reports
│   │   │   └── qr-service.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── seed.sql
│   │   │   └── queries.ts       # Prepared statement helpers
│   │   └── types.ts
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
├── web/                          # React frontend
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   ├── sw.js                 # Service worker
│   │   └── icons/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx      # Main layout with sidebar
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── ui/                   # Reusable UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── StatusPill.tsx
│   │   │   ├── equipment/
│   │   │   │   ├── EquipmentList.tsx
│   │   │   │   ├── EquipmentForm.tsx
│   │   │   │   ├── EquipmentDetail.tsx
│   │   │   │   └── QRScanner.tsx
│   │   │   ├── maintenance/
│   │   │   │   ├── LogForm.tsx       # Main maintenance logging form
│   │   │   │   ├── LogList.tsx
│   │   │   │   └── QuickLog.tsx      # Post-QR-scan quick form
│   │   │   ├── dashboard/
│   │   │   │   ├── Overview.tsx
│   │   │   │   ├── EntityBreakdown.tsx
│   │   │   │   ├── TrendChart.tsx
│   │   │   │   ├── CategoryRanking.tsx
│   │   │   │   └── TechnicianLoad.tsx
│   │   │   ├── reports/
│   │   │   │   ├── ReportGenerator.tsx
│   │   │   │   ├── ReportList.tsx
│   │   │   │   └── ReportPreview.tsx
│   │   │   └── admin/
│   │   │       ├── OrgEntityManager.tsx
│   │   │       ├── CategoryManager.tsx
│   │   │       └── TechnicianManager.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EquipmentPage.tsx
│   │   │   ├── MaintenancePage.tsx
│   │   │   ├── ScanPage.tsx          # QR scanner page
│   │   │   ├── ReportsPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useApi.ts
│   │   │   ├── useOfflineSync.ts
│   │   │   └── useQRScanner.ts
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── OfflineContext.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts     # Fetch wrapper with auth
│   │   │   ├── offline-store.ts  # IndexedDB for offline logs
│   │   │   ├── constants.ts
│   │   │   └── utils.ts
│   │   └── types.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── package.json
│   └── tsconfig.json
└── package.json                  # Workspace root (npm workspaces)
```

## OHCS Organizational Structure (CRITICAL — seed this exactly)

### Directorates (type: 'directorate')
| Code | Full Name |
|------|-----------|
| F&A | Finance & Administration |
| RTDD | Research, Training & Development Directorate |
| CMD | Conditions of Service, Manpower & Development |
| PBMED | Performance, Benefits, Monitoring & Evaluation Directorate |
| RSIMD | Research, Statistics & Information Management Directorate |

### Units (type: 'unit')
| Code | Full Name |
|------|-----------|
| COUNCIL | Council |
| ESTATE | Estate |
| ACCOUNTS | Accounts |
| AUDIT | Internal Audit |
| RCU | Reform Coordinating Unit |

### Secretariat (type: 'secretariat')
| Code | Full Name |
|------|-----------|
| CD-SEC | Chief Director's Secretariat |

All stored in a single `org_entities` table with a `type` field. The system must allow adding new directorates, units, or other entity types at any time through the admin panel without code changes.

## D1 Database Schema

```sql
-- ============================================
-- RSIMD-ITEMS D1 Schema
-- ============================================

-- Organizational entities (directorates, units, secretariats)
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

-- IT equipment registry
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Maintenance categories (extensible without code changes)
CREATE TABLE IF NOT EXISTS maintenance_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- IT technicians / users
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

-- Maintenance activity logs (core transaction table)
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

-- Generated quarterly reports
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

-- Report challenges and recommendations
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

-- Indexes
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
```

## Seed Data

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

-- Maintenance categories
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

-- Default admin user (password: admin123 — change immediately after first login)
-- Hash this with bcrypt in the setup script
INSERT INTO technicians (id, name, role, email, phone, assigned_entities, is_active, password_hash) VALUES
  ('tech-admin', 'System Administrator', 'admin', 'admin@ohcs.gov.gh', '', '[]', 1, '$2b$10$PLACEHOLDER_HASH_REPLACE_IN_SETUP');
```

## API Routes (implement all of these)

```
Authentication
  POST   /api/auth/login          → { token, technician }
  POST   /api/auth/logout         → { success }
  GET    /api/auth/me             → { technician }

Org Entities
  GET    /api/org-entities                  → { entities[] }  (supports ?type=directorate|unit|secretariat)
  GET    /api/org-entities/:id              → { entity }
  POST   /api/org-entities                  → { entity }      (admin only)
  PUT    /api/org-entities/:id              → { entity }      (admin only)
  DELETE /api/org-entities/:id              → { success }     (admin only, soft delete via is_active)

Equipment
  GET    /api/equipment                     → { equipment[] } (supports ?org_entity_id=&status=&type=)
  GET    /api/equipment/:id                 → { equipment, maintenance_history[] }
  GET    /api/equipment/by-tag/:assetTag    → { equipment }   (for QR scan lookup)
  POST   /api/equipment                     → { equipment }
  PUT    /api/equipment/:id                 → { equipment }
  DELETE /api/equipment/:id                 → { success }     (soft delete via status=decommissioned)

Maintenance Logs
  GET    /api/maintenance                   → { logs[] }      (supports ?year=&quarter=&maintenance_type=&org_entity_id=&category_id=)
  GET    /api/maintenance/:id               → { log }
  POST   /api/maintenance                   → { log }
  PUT    /api/maintenance/:id               → { log }
  POST   /api/maintenance/bulk-sync         → { synced_count, errors[] }  (offline sync endpoint)

Categories
  GET    /api/categories                    → { categories[] }
  POST   /api/categories                    → { category }    (admin only)
  PUT    /api/categories/:id                → { category }    (admin only)

Technicians
  GET    /api/technicians                   → { technicians[] }
  GET    /api/technicians/:id               → { technician }
  POST   /api/technicians                   → { technician }  (admin only)
  PUT    /api/technicians/:id               → { technician }  (admin only)

Reports
  GET    /api/reports                       → { reports[] }
  GET    /api/reports/:id                   → { report }
  POST   /api/reports/generate              → { report }      (body: { year, quarter })
  GET    /api/reports/:id/download          → DOCX file stream from R2

Dashboard
  GET    /api/dashboard/summary             → { totals_by_type, totals_by_month, totals_by_entity }  (query: ?year=&quarter=)
  GET    /api/dashboard/trends              → { monthly_data[] }  (query: ?year=)
  GET    /api/dashboard/entity/:id          → { entity_detail_breakdown }  (query: ?year=&quarter=)
```

## Report Generation (CRITICAL FEATURE)

The auto-generated DOCX must match this exact structure from OHCS's established format:

```
RESEARCH, STATISTICS, AND INFORMATION MANAGEMENT DIRECTORATE (RSIMD)
[QUARTER] EQUIPMENT MAINTENANCE REPORT
([MONTH_RANGE], [YEAR])

TABLE OF CONTENTS
1.0 INTRODUCTION
  1.1 OBJECTIVES
2.0 METHODOLOGY
3.0 DETAILS OF MAINTENANCE AND SERVICING
  3.1 Condition Based Servicing and Monitoring
  3.2 Routine Maintenance and Servicing     ← TABLE: category × month1 × month2 × month3 × total
  3.3 Corrective Maintenance                ← TABLE: description × quantity + TABLE: directorate × room × issues
  3.4 Emergency Maintenance                 ← TABLE: description × month1 × month2 × month3 × total
  3.5 Predictive Maintenance
4.0 CHALLENGES
5.0 RECOMMENDATIONS
6.0 CONCLUSION
```

### Report generation flow:

1. **Aggregate from D1**: Query maintenance_logs for the given year+quarter, grouped by:
   - Routine: `GROUP BY category_id, month` → pivot into the monthly table
   - Corrective: `GROUP BY category_id` for summary + `GROUP BY org_entity_id, room_number` for breakdown
   - Emergency: `GROUP BY category_id, month` → pivot into the monthly table
   - Condition-based and Predictive: COUNT + descriptions

2. **Generate narratives via Workers AI**: Call `@cf/meta/llama-3.1-70b-instruct` with a structured prompt containing all the aggregated numbers. The AI writes:
   - Introduction paragraph (referencing actual quarter and year)
   - Methodology section
   - Narrative for each maintenance type section
   - Challenges (derived from flagged issues and data patterns like recurring failures)
   - Recommendations (derived from equipment aging, recurring categories, unresolved issues)
   - Conclusion summarizing impact

   **AI prompt pattern:**
   ```
   System: You are writing a formal quarterly IT equipment maintenance report for the Office of the Head of Civil Service (OHCS), Ghana. The report is produced by the Research, Statistics & Information Management Directorate (RSIMD). Write in formal British English as used in Ghana government documents. Be precise with numbers — use the exact figures provided. Do not invent statistics.

   User: Generate the [SECTION_NAME] section for the Q[N] [YEAR] report.
   Data: [JSON with aggregated numbers]
   Previous quarter comparison: [JSON if available]
   ```

3. **Assemble DOCX**: Use the `docx` npm package (docx-js) to build the Word document:
   - A4 page size (11906 × 16838 DXA) — Ghana uses A4
   - Arial font, 12pt body, 16pt H1, 14pt H2
   - Bold centered title block
   - Auto-generated Table of Contents
   - Properly formatted tables with borders and shading
   - Numbered headings
   - Bullet lists for challenges and recommendations

4. **Upload to R2** and save report record to D1.

## Dashboard Design

The dashboard uses Ghana's national colors as accents:
- Primary: `#006B3F` (green)
- Accent: `#FCD116` (gold)
- Danger: `#CE1126` (red)
- Neutral: `#1a1a1a` (black)
- Background: clean white/gray

### Dashboard sections:
1. **Summary cards** (top row): Total logs this quarter, by maintenance type (5 cards), quarter-over-quarter change percentage
2. **Monthly trend chart** (Recharts BarChart): Stacked bars showing maintenance types per month
3. **Entity breakdown** (Recharts): Horizontal bar chart showing log count per directorate/unit
4. **Top categories** (ranked list): Most common maintenance categories this quarter
5. **Recent activity feed**: Latest 10 maintenance logs with technician, equipment, type
6. **Equipment health**: Pie chart of equipment status (active/faulty/under repair/decommissioned)

## QR Code & Scan Flow

1. **Generate**: When equipment is registered, generate a QR code encoding the URL: `https://rsimd-items.ohcs.gov.gh/scan/{asset_tag}`
2. **Print**: QR code is downloadable as PNG for printing as sticker labels
3. **Scan**: Technician opens the Scan page → camera activates → scans QR → app calls `GET /api/equipment/by-tag/{tag}` → pre-populates the maintenance log form with equipment details, org entity, room number
4. **Log**: Technician selects maintenance type, category, writes description → submits
5. Use `html5-qrcode` npm package for the scanner component

## Offline-First PWA

### Service Worker Strategy:
- **App Shell**: Cache-first for HTML, CSS, JS, icons (Workbox precache)
- **API Data**: Network-first with IndexedDB fallback for: org_entities, equipment list, categories
- **Maintenance Logs**: When offline, save to IndexedDB. When back online, POST to `/api/maintenance/bulk-sync`
- **Photos**: Queue in IndexedDB as base64, upload to R2 on sync

### PWA Manifest:
```json
{
  "name": "RSIMD-ITEMS — OHCS Equipment Maintenance",
  "short_name": "RSIMD-ITEMS",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#006B3F",
  "background_color": "#ffffff",
  "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }, { "src": "/icons/icon-512.png", "sizes": "512x512" }]
}
```

## Authentication

Simple token-based auth (no OAuth needed for internal government tool):
- Login with username + password → bcrypt verify → generate `ritems_` prefixed token → store in KV with 24h TTL
- Token sent as `Authorization: Bearer ritems_xxxxx` header
- Middleware validates token against KV on every protected request
- Three roles: `technician` (log maintenance), `lead` (generate reports + all tech permissions), `admin` (manage everything)

## UI/UX Requirements

- **Mobile-first**: The maintenance logging flow (scan → log → submit) must work perfectly on mobile phones. This is the primary use case.
- **Responsive**: Dashboard works on desktop for the IT lead and management.
- **Fast**: Dashboard loads < 2 seconds. Logging form opens < 1 second after QR scan.
- **Accessible**: Works on low-end Android phones common in Ghana government offices.
- **Clear feedback**: Success/error toasts on every action. Loading states on all async operations.
- **Ghana context**: Date format DD/MM/YYYY. Currency GHS where relevant.

## wrangler.toml Configuration

```toml
name = "rsimd-items-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "rsimd_items_db"
database_id = "REPLACE_WITH_ACTUAL_ID"

[[kv_namespaces]]
binding = "KV"
id = "REPLACE_WITH_ACTUAL_ID"

[[r2_buckets]]
binding = "R2"
bucket_name = "rsimd-items-files"

[ai]
binding = "AI"
```

## Build Order

Build in this exact sequence, testing each piece before moving on:

1. **Project scaffolding** — monorepo with npm workspaces, both packages compile clean
2. **D1 schema + seed** — all tables created, OHCS org data seeded, verify with wrangler d1 queries
3. **Worker router + middleware** — CORS, auth middleware, error handling, basic health check
4. **Auth endpoints** — login/logout/me with KV token storage
5. **Org entity CRUD** — full API + React admin page to manage directorates/units
6. **Equipment CRUD** — full API + React pages (list, detail, form) + QR code generation
7. **Maintenance log CRUD** — full API + mobile-optimized logging form + QR scan flow
8. **Dashboard** — aggregation queries + React dashboard page with Recharts
9. **Report generator** — D1 aggregation + Workers AI narratives + DOCX assembly + R2 storage
10. **Offline PWA** — service worker, IndexedDB, background sync, PWA manifest

## Important Notes

- Use `crypto.randomUUID()` for all ID generation (available in Workers runtime)
- All dates stored as ISO 8601 strings in D1
- Quarter calculation: Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
- Month names in reports: use full names (January, February, etc.)
- The `rooms` field on org_entities is a JSON string array (D1 doesn't support array types)
- All `is_active` / boolean fields use INTEGER (0/1) since D1 is SQLite
- For the AI narrator, always pass the raw numbers and let the AI write prose — never hardcode narrative templates
- The report DOCX must be downloadable and openable in Microsoft Word and LibreOffice without corruption
- Use `itty-router` for the Worker router — it's lightweight and well-suited for Workers

Start building now. Begin with step 1 (project scaffolding) and work through each step sequentially. After each major step, briefly confirm what was built before moving to the next.
