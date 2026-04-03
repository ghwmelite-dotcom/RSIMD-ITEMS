# RSIMD-ITEMS Design Specification

**Date:** 2026-04-03
**Status:** Approved
**Author:** Osborne Hodges (RSIMD) + Claude Code
**Source PRD:** `RSIMD_ITEMS_PRD.md`
**Source Build Prompt:** `RSIMD_ITEMS_CLAUDE_CODE_PROMPT.md`

---

## 1. System Purpose

RSIMD-ITEMS replaces manual Word-based quarterly IT maintenance reporting at Ghana's Office of the Head of Civil Service (OHCS) with a digital system that:

1. Maintains a centralized IT equipment registry with QR asset tags
2. Logs every maintenance activity via mobile-first PWA with scan-to-log
3. Auto-generates the quarterly DOCX maintenance report matching OHCS's exact format
4. Provides a real-time analytics dashboard
5. Works offline for field technicians

## 2. Tech Stack (Strict)

| Layer | Technology |
|-------|-----------|
| API | Cloudflare Workers (TypeScript) with itty-router |
| Database | Cloudflare D1 (SQLite) |
| Cache/Sessions | Cloudflare KV |
| File Storage | Cloudflare R2 |
| Realtime/Sync | Cloudflare Durable Objects |
| AI | Workers AI — `@cf/meta/llama-3.1-70b-instruct` (narratives), `@cf/baai/bge-base-en-v1.5` (embeddings) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Charts | Recharts |
| Reports | `docx` npm (docx-js) |
| QR | `qrcode` npm + `html5-qrcode` (scanner) |
| PWA | Workbox |

No substitutions.

## 3. Architecture

### 3.1 Monorepo Structure

npm workspaces with two packages:
- `api/` — Cloudflare Worker backend
- `web/` — React frontend (Vite)

### 3.2 Backend Architecture

```
api/src/
├── index.ts              # Worker entry point
├── router.ts             # itty-router route definitions
├── routes/               # Route handlers (one file per resource)
│   ├── auth.ts
│   ├── org-entities.ts
│   ├── equipment.ts
│   ├── maintenance.ts
│   ├── categories.ts
│   ├── technicians.ts
│   ├── reports.ts
│   └── dashboard.ts
├── middleware/
│   ├── auth.ts           # Token validation via KV
│   ├── cors.ts
│   └── error-handler.ts
├── services/
│   ├── report-generator.ts   # DOCX assembly with docx-js
│   ├── ai-narrator.ts        # Workers AI narrative generation
│   ├── aggregator.ts         # D1 aggregation queries for reports/dashboard
│   └── qr-service.ts         # QR code generation
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   └── queries.ts       # Prepared statement helpers
└── types.ts
```

Worker bindings: `DB` (D1), `KV` (KV), `R2` (R2), `AI` (Workers AI).

### 3.3 Frontend Architecture

```
web/src/
├── main.tsx / App.tsx
├── components/
│   ├── layout/          # AppShell, Sidebar, Header
│   ├── ui/              # Button, Input, Select, Table, Card, Badge, Modal, StatusPill
│   ├── equipment/       # EquipmentList, EquipmentForm, EquipmentDetail, QRScanner
│   ├── maintenance/     # LogForm, LogList, QuickLog
│   ├── dashboard/       # Overview, EntityBreakdown, TrendChart, CategoryRanking, TechnicianLoad
│   ├── reports/         # ReportGenerator, ReportList, ReportPreview
│   └── admin/           # OrgEntityManager, CategoryManager, TechnicianManager
├── pages/               # LoginPage, DashboardPage, EquipmentPage, MaintenancePage, ScanPage, ReportsPage, AdminPage
├── hooks/               # useAuth, useApi, useOfflineSync, useQRScanner
├── context/             # AuthContext, OfflineContext
├── lib/                 # api-client, offline-store (IndexedDB), constants, utils
└── types.ts
```

### 3.4 Data Flow

```
Technician → QR Scan → Equipment Lookup → Log Form → POST /api/maintenance
                                                        ↓
                                              D1 (maintenance_logs)
                                                        ↓
                                              Dashboard aggregations (KV-cached)
                                                        ↓
                                              Report generation → Workers AI → DOCX → R2
```

Offline path:
```
Technician → QR Scan → Log Form → IndexedDB queue
                                        ↓ (when online)
                                  POST /api/maintenance/bulk-sync → D1
```

## 4. Database Design

### 4.1 Tables

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `org_entities` | Directorates, units, secretariats | Referenced by equipment, maintenance_logs |
| `equipment` | IT asset registry | Belongs to org_entity |
| `maintenance_categories` | Extensible issue types | Referenced by maintenance_logs |
| `technicians` | System users with roles | Author of maintenance_logs |
| `maintenance_logs` | Core transaction table | References equipment, technician, org_entity, category |
| `reports` | Generated quarterly reports | References technician (generated_by) |
| `report_items` | Challenges/recommendations per report | Belongs to report |

### 4.2 Key Design Decisions

- **IDs**: `crypto.randomUUID()` (TEXT PRIMARY KEY)
- **Booleans**: INTEGER 0/1 (SQLite)
- **Arrays**: JSON strings (D1 has no array type) — `rooms`, `assigned_entities`, `photo_urls`
- **Dates**: ISO 8601 TEXT strings
- **Soft deletes**: `is_active` flag on org_entities, categories, technicians; `status=decommissioned` on equipment
- **Quarter/month/year**: Denormalized on maintenance_logs for fast aggregation queries

### 4.3 Seed Data

- 5 directorates (F&A, RTDD, CMD, PBMED, RSIMD) with room numbers
- 5 units (Council, Estate, Accounts, Internal Audit, RCU)
- 1 secretariat (Chief Director's Secretariat)
- 14 maintenance categories matching OHCS's established categories
- 1 admin user (password changed on first login)

Full schema and seed SQL defined in PRD — implement exactly as specified.

## 5. Authentication & Authorization

- Simple token-based (no OAuth — internal government tool)
- Login: username + password → bcrypt verify → generate `ritems_` prefixed token → store in KV with 24h TTL
- Token sent as `Authorization: Bearer ritems_xxxxx`
- Middleware validates against KV on every protected request
- Three roles:
  - `technician` — log maintenance, view equipment/dashboard
  - `lead` — all technician permissions + generate reports
  - `admin` — full CRUD on all resources

## 6. API Design

Full REST API with 30+ endpoints across 8 resource groups. All endpoints return JSON. All mutating endpoints require auth. Admin-only endpoints enforce role check.

Key endpoints by resource:
- **Auth**: login, logout, me
- **Org Entities**: CRUD with type filtering
- **Equipment**: CRUD + by-tag lookup (QR scan) + by-entity filtering
- **Maintenance**: CRUD + bulk-sync (offline) + filtering by quarter/entity/type/category
- **Categories**: CRUD (admin)
- **Technicians**: CRUD (admin)
- **Reports**: list, detail, generate (year+quarter), download (DOCX from R2)
- **Dashboard**: summary, trends, entity breakdown

All queries use prepared statements. No string-concatenated SQL.

## 7. Report Generation

The most complex feature. Generates a formal DOCX matching OHCS's exact quarterly report format.

### 7.1 Report Structure

```
RSIMD [QUARTER] EQUIPMENT MAINTENANCE REPORT
├── Table of Contents
├── 1.0 Introduction (AI narrative)
│   └── 1.1 Objectives
├── 2.0 Methodology (AI narrative)
├── 3.0 Details of Maintenance and Servicing
│   ├── 3.1 Condition-Based (AI narrative + count)
│   ├── 3.2 Routine Maintenance (TABLE: category x month x total)
│   ├── 3.3 Corrective Maintenance (TABLE: summary + directorate/room breakdown)
│   ├── 3.4 Emergency Maintenance (TABLE: category x month x total)
│   └── 3.5 Predictive Maintenance (AI narrative)
├── 4.0 Challenges (AI-generated from flagged issues)
├── 5.0 Recommendations (AI-generated from data patterns)
└── 6.0 Conclusion (AI summary)
```

### 7.2 Generation Pipeline

1. **Aggregate** from D1: grouped queries per maintenance type
2. **Generate narratives** via Workers AI (`@cf/meta/llama-3.1-70b-instruct`) with structured prompts containing real data
3. **Assemble DOCX** via docx-js: A4, Arial font, formatted tables, numbered headings
4. **Upload** to R2, save record to D1

### 7.3 DOCX Format

- A4 page size (11906 x 16838 DXA)
- Arial font: 12pt body, 16pt H1, 14pt H2
- Bold centered title block
- Tables with borders and shading
- Numbered headings, bullet lists

## 8. Dashboard Design

### 8.1 Color Palette (Ghana national colors)

- Primary: `#006B3F` (green)
- Accent: `#FCD116` (gold)
- Danger: `#CE1126` (red)
- Neutral: `#1a1a1a` (black)
- Background: white/light gray

### 8.2 Dashboard Sections

1. **Summary cards** — Total logs + 5 maintenance type cards + QoQ change
2. **Monthly trend chart** — Recharts stacked BarChart by maintenance type
3. **Entity breakdown** — Horizontal bar chart per directorate/unit
4. **Top categories** — Ranked list of most common issues
5. **Recent activity feed** — Latest 10 logs
6. **Equipment health** — Pie chart of status distribution

## 9. QR Code Flow

1. Equipment registration → QR code generated encoding `https://rsimd-items.ohcs.gov.gh/scan/{asset_tag}`
2. QR downloadable as PNG for printing sticker labels
3. Technician scans → `GET /api/equipment/by-tag/{tag}` → pre-populates log form
4. Technician fills maintenance details → submits

## 10. Offline-First PWA

### 10.1 Service Worker Strategy (Workbox)

- **App Shell**: Cache-first (HTML, CSS, JS, icons)
- **API Data**: Network-first with IndexedDB fallback (org_entities, equipment, categories)
- **Maintenance Logs**: Save to IndexedDB when offline → bulk-sync when online
- **Photos**: Queue as base64 in IndexedDB → upload to R2 on sync

### 10.2 Conflict Resolution

Last-write-wins with timestamp comparison.

### 10.3 PWA Manifest

- `display: standalone`, `theme_color: #006B3F`
- Icons at 192px and 512px

## 11. Non-Functional Requirements

- Dashboard loads < 2s on 3G (KV-cached aggregations)
- Full offline maintenance logging
- Token-based auth with role enforcement
- 10-50 concurrent users
- WCAG 2.1 AA accessibility
- Works on low-end Android phones
- Date format: DD/MM/YYYY

## 12. Build Order (Canonical)

| Step | Scope | Validates |
|------|-------|-----------|
| 1 | Project scaffolding — monorepo, both packages compile | Build tooling |
| 2 | D1 schema + seed — all tables, OHCS org data | Database layer |
| 3 | Worker router + middleware — CORS, auth MW, error handling | Request pipeline |
| 4 | Auth endpoints — login/logout/me with KV tokens | Auth flow |
| 5 | Org entity CRUD — API + React admin page | First full vertical slice |
| 6 | Equipment CRUD — API + React pages + QR generation | Asset management |
| 7 | Maintenance log CRUD — API + mobile form + QR scan flow | Core workflow |
| 8 | Dashboard — aggregation queries + Recharts | Data visualization |
| 9 | Report generator — aggregation + AI narratives + DOCX + R2 | Most complex feature |
| 10 | Offline PWA — service worker, IndexedDB, background sync | Offline capability |

Each step is tested before proceeding to the next.

## 13. Error Handling

- Global error handler middleware catches unhandled exceptions
- Structured JSON error responses: `{ error: string, details?: any }`
- Success/error toasts on every frontend action
- Loading states on all async operations

## 14. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Workers AI quality for formal government prose | Fine-tuned prompts; allow manual editing before final DOCX |
| Low smartphone adoption | Desktop-compatible; QR scanning optional (manual selection available) |
| D1 query complexity | Pre-compute + KV-cache quarterly aggregations |
| Internet reliability at OHCS | Offline-first architecture (Step 10) |
| Resistance to new workflow | Pilot with RSIMD directorate first |
