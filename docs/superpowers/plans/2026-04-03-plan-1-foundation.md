# RSIMD-ITEMS Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo, D1 database schema with seed data, Cloudflare Worker API with router and middleware, auth endpoints, and a minimal React app shell — everything needed before building CRUD features.

**Architecture:** npm workspaces monorepo with `api/` (Cloudflare Worker + itty-router + D1/KV/R2 bindings) and `web/` (React 18 + Vite + Tailwind). Auth is token-based with bcrypt password hashing and KV-stored session tokens prefixed `ritems_`.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, KV, itty-router, React 18, Vite, Tailwind CSS, React Router v6, bcryptjs

---

## File Structure

### `api/` (Cloudflare Worker)

| File | Responsibility |
|------|---------------|
| `api/package.json` | Worker dependencies and scripts |
| `api/tsconfig.json` | TypeScript config for Workers |
| `api/wrangler.toml` | Cloudflare bindings (D1, KV, R2, AI) |
| `api/src/index.ts` | Worker entry point — creates router, attaches middleware, exports fetch handler |
| `api/src/router.ts` | Route definitions using itty-router |
| `api/src/types.ts` | Shared types: Env bindings, DB row types, API response types |
| `api/src/middleware/cors.ts` | CORS headers for cross-origin requests |
| `api/src/middleware/auth.ts` | Token validation middleware — checks KV for `ritems_` tokens |
| `api/src/middleware/error-handler.ts` | Global error handler — catches unhandled exceptions, returns structured JSON |
| `api/src/routes/auth.ts` | Login, logout, me endpoints |
| `api/src/db/schema.sql` | All CREATE TABLE and CREATE INDEX statements |
| `api/src/db/seed.sql` | INSERT statements for org_entities, maintenance_categories, admin user |
| `api/src/db/queries.ts` | Prepared statement helper functions |

### `web/` (React Frontend)

| File | Responsibility |
|------|---------------|
| `web/package.json` | Frontend dependencies and scripts |
| `web/tsconfig.json` | TypeScript config for React |
| `web/vite.config.ts` | Vite config with proxy to Worker dev server |
| `web/tailwind.config.ts` | Tailwind config with Ghana national colors |
| `web/postcss.config.js` | PostCSS config for Tailwind |
| `web/index.html` | HTML entry point |
| `web/src/main.tsx` | React entry — renders App |
| `web/src/App.tsx` | Router setup with AuthContext provider |
| `web/src/types.ts` | Shared frontend types matching API responses |
| `web/src/lib/constants.ts` | API base URL, color tokens, role definitions |
| `web/src/lib/api-client.ts` | Fetch wrapper with auth header injection and error handling |
| `web/src/context/AuthContext.tsx` | Auth state provider — token storage, login/logout, current user |
| `web/src/hooks/useAuth.ts` | Hook to consume AuthContext |
| `web/src/hooks/useApi.ts` | Hook for API calls with loading/error states |
| `web/src/pages/LoginPage.tsx` | Login form |
| `web/src/pages/DashboardPage.tsx` | Placeholder dashboard (built in Plan 3) |
| `web/src/components/layout/AppShell.tsx` | Main layout with sidebar and header |
| `web/src/components/layout/Sidebar.tsx` | Navigation sidebar with role-based menu items |
| `web/src/components/layout/Header.tsx` | Top bar with user info and logout |
| `web/src/components/ui/Button.tsx` | Reusable button component |
| `web/src/components/ui/Input.tsx` | Reusable input component |
| `web/src/components/ui/Card.tsx` | Reusable card component |

### Root

| File | Responsibility |
|------|---------------|
| `package.json` | Workspace root — defines workspaces, root scripts |
| `.gitignore` | Ignore node_modules, dist, .wrangler, .dev.vars |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/wrangler.toml`
- Create: `api/src/index.ts`
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/tailwind.config.ts`
- Create: `web/postcss.config.js`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`

- [ ] **Step 1: Initialize git repo**

```bash
cd "C:/Users/USER/OneDrive - Smart Workplace/Desktop/Projects/RSIMD-ITEMS"
git init
```

- [ ] **Step 2: Create root package.json with workspaces**

Create `package.json`:

```json
{
  "name": "rsimd-items",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["api", "web"],
  "scripts": {
    "dev:api": "npm run dev --workspace=api",
    "dev:web": "npm run dev --workspace=web",
    "build:api": "npm run build --workspace=api",
    "build:web": "npm run build --workspace=web"
  }
}
```

- [ ] **Step 3: Create .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
.wrangler/
.dev.vars
*.log
.DS_Store
```

- [ ] **Step 4: Create api/package.json**

Create `api/package.json`:

```json
{
  "name": "rsimd-items-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "db:init": "wrangler d1 execute rsimd_items_db --local --file=src/db/schema.sql",
    "db:seed": "wrangler d1 execute rsimd_items_db --local --file=src/db/seed.sql",
    "db:reset": "npm run db:init && npm run db:seed"
  },
  "dependencies": {
    "itty-router": "^5.0.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240909.0",
    "typescript": "^5.5.0",
    "wrangler": "^3.78.0",
    "@types/bcryptjs": "^2.4.6"
  }
}
```

- [ ] **Step 5: Create api/tsconfig.json**

Create `api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create api/wrangler.toml**

Create `api/wrangler.toml`:

```toml
name = "rsimd-items-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "rsimd_items_db"
database_id = "local"

[[kv_namespaces]]
binding = "KV"
id = "local"

[[r2_buckets]]
binding = "R2"
bucket_name = "rsimd-items-files"

[ai]
binding = "AI"
```

- [ ] **Step 7: Create api/src/index.ts — minimal Worker entry**

Create `api/src/index.ts`:

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: "ok", service: "rsimd-items-api" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

- [ ] **Step 8: Create web/package.json**

Create `web/package.json`:

```json
{
  "name": "rsimd-items-web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 9: Create web/tsconfig.json**

Create `web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 10: Create web/vite.config.ts**

Create `web/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 11: Create web/tailwind.config.ts**

Create `web/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ghana: {
          green: "#006B3F",
          gold: "#FCD116",
          red: "#CE1126",
          black: "#1a1a1a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 12: Create web/postcss.config.js**

Create `web/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 13: Create web/index.html**

Create `web/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#006B3F" />
    <title>RSIMD-ITEMS — OHCS Equipment Maintenance</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-gray-50 text-ghana-black antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 14: Create web/src/main.tsx**

Create `web/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 15: Create web/src/index.css**

Create `web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 16: Create web/src/App.tsx — minimal route setup**

Create `web/src/App.tsx`:

```tsx
import { Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold text-ghana-green">RSIMD-ITEMS</h1><p className="mt-2 text-gray-600">OHCS Equipment Maintenance System</p></div>} />
    </Routes>
  );
}
```

- [ ] **Step 17: Install dependencies**

```bash
npm install
```

- [ ] **Step 18: Verify both packages compile**

```bash
cd api && npx tsc --noEmit && cd ../web && npx tsc --noEmit
```

Expected: No errors from either.

- [ ] **Step 19: Verify Worker starts**

```bash
cd api && npx wrangler dev --local &
sleep 3
curl http://localhost:8787
kill %1
```

Expected: `{"status":"ok","service":"rsimd-items-api"}`

- [ ] **Step 20: Verify Vite starts**

```bash
cd web && npx vite --host 127.0.0.1 &
sleep 3
curl http://127.0.0.1:5173
kill %1
```

Expected: HTML response containing "RSIMD-ITEMS"

- [ ] **Step 21: Commit scaffolding**

```bash
git add package.json .gitignore api/ web/
git commit -m "feat: project scaffolding — monorepo with Worker API and React frontend"
```

---

## Task 2: D1 Schema and Seed Data

**Files:**
- Create: `api/src/db/schema.sql`
- Create: `api/src/db/seed.sql`
- Create: `api/src/types.ts`

- [ ] **Step 1: Create api/src/db/schema.sql**

Create `api/src/db/schema.sql`:

```sql
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
```

- [ ] **Step 2: Create api/src/db/seed.sql**

Create `api/src/db/seed.sql`:

```sql
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

-- Default admin user (bcrypt hash of 'admin123')
-- Hash: $2a$10$rQEY1f3wOrpOhLFcKXwSIeKlGj6rqFqBmkaT6HODWqbjsxVml3fKa
INSERT OR IGNORE INTO technicians (id, name, role, email, phone, assigned_entities, is_active, password_hash) VALUES
  ('tech-admin', 'System Administrator', 'admin', 'admin@ohcs.gov.gh', '', '[]', 1, '$2a$10$rQEY1f3wOrpOhLFcKXwSIeKlGj6rqFqBmkaT6HODWqbjsxVml3fKa');
```

- [ ] **Step 3: Create api/src/types.ts**

Create `api/src/types.ts`:

```typescript
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: Ai;
  ENVIRONMENT: string;
}

// Database row types

export interface OrgEntityRow {
  id: string;
  name: string;
  code: string;
  type: "directorate" | "unit" | "secretariat";
  rooms: string; // JSON array
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentRow {
  id: string;
  asset_tag: string;
  type: "desktop" | "laptop" | "printer" | "scanner" | "router" | "switch" | "access_point" | "cctv" | "ups" | "other";
  make: string | null;
  model: string | null;
  processor: string | null;
  serial_number: string | null;
  org_entity_id: string;
  room_number: string | null;
  status: "active" | "faulty" | "decommissioned" | "under_repair";
  installed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceCategoryRow {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface TechnicianRow {
  id: string;
  name: string;
  role: "technician" | "lead" | "admin";
  email: string | null;
  phone: string | null;
  assigned_entities: string; // JSON array
  is_active: number;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLogRow {
  id: string;
  equipment_id: string | null;
  technician_id: string;
  org_entity_id: string;
  maintenance_type: "condition_based" | "routine" | "corrective" | "emergency" | "predictive";
  category_id: string | null;
  room_number: string | null;
  description: string;
  resolution: string | null;
  status: "pending" | "in_progress" | "completed" | "escalated";
  photo_urls: string; // JSON array
  logged_date: string;
  quarter: number;
  month: number;
  year: number;
  created_offline: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: string;
  title: string;
  quarter: number;
  year: number;
  file_url: string | null;
  file_size: number | null;
  generated_by: string | null;
  status: "draft" | "generated" | "reviewed" | "approved";
  ai_model: string | null;
  generation_log: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportItemRow {
  id: string;
  report_id: string;
  type: "challenge" | "recommendation";
  description: string;
  category: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  auto_generated: number;
  created_at: string;
}

// API response types

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

// Auth types

export interface AuthSession {
  technician_id: string;
  role: "technician" | "lead" | "admin";
  name: string;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  session: AuthSession;
}
```

- [ ] **Step 4: Run schema against local D1**

```bash
cd api && npx wrangler d1 execute rsimd_items_db --local --file=src/db/schema.sql
```

Expected: Tables created successfully.

- [ ] **Step 5: Run seed against local D1**

```bash
cd api && npx wrangler d1 execute rsimd_items_db --local --file=src/db/seed.sql
```

Expected: 11 org_entities, 14 categories, 1 technician inserted.

- [ ] **Step 6: Verify seed data**

```bash
cd api && npx wrangler d1 execute rsimd_items_db --local --command="SELECT code, type FROM org_entities ORDER BY type, code"
```

Expected: 11 rows — 5 directorates, 1 secretariat, 5 units.

- [ ] **Step 7: Commit schema and seed**

```bash
git add api/src/db/ api/src/types.ts
git commit -m "feat: D1 schema with all tables, indexes, and OHCS seed data"
```

---

## Task 3: Worker Router and Middleware

**Files:**
- Create: `api/src/router.ts`
- Create: `api/src/middleware/cors.ts`
- Create: `api/src/middleware/auth.ts`
- Create: `api/src/middleware/error-handler.ts`
- Modify: `api/src/index.ts`

- [ ] **Step 1: Create api/src/middleware/cors.ts**

Create `api/src/middleware/cors.ts`:

```typescript
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCorsPrelight(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return null;
}
```

- [ ] **Step 2: Create api/src/middleware/error-handler.ts**

Create `api/src/middleware/error-handler.ts`:

```typescript
import { corsHeaders } from "./cors";

export function jsonResponse(data: unknown, status = 200, request?: Request): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (request) {
    Object.assign(headers, corsHeaders(request));
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(error: string, status = 500, request?: Request, details?: unknown): Response {
  return jsonResponse({ error, details }, status, request);
}

export function handleError(err: unknown, request: Request): Response {
  console.error("Unhandled error:", err);

  const message = err instanceof Error ? err.message : "Internal server error";
  return errorResponse(message, 500, request);
}
```

- [ ] **Step 3: Create api/src/middleware/auth.ts**

Create `api/src/middleware/auth.ts`:

```typescript
import type { Env, AuthSession } from "../types";
import { errorResponse } from "./error-handler";

export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthSession | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ritems_")) {
    return errorResponse("Missing or invalid authorization token", 401, request);
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  const sessionJson = await env.KV.get(`session:${token}`);
  if (!sessionJson) {
    return errorResponse("Token expired or invalid", 401, request);
  }

  return JSON.parse(sessionJson) as AuthSession;
}

export function requireRole(session: AuthSession, ...roles: AuthSession["role"][]): Response | null {
  if (!roles.includes(session.role)) {
    return new Response(
      JSON.stringify({ error: `Requires role: ${roles.join(" or ")}` }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}
```

- [ ] **Step 4: Create api/src/router.ts**

Create `api/src/router.ts`:

```typescript
import { Router } from "itty-router";

const router = Router();

// Health check
router.get("/api/health", () => {
  return new Response(JSON.stringify({ status: "ok", service: "rsimd-items-api" }), {
    headers: { "Content-Type": "application/json" },
  });
});

// 404 catch-all
router.all("*", () => {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});

export { router };
```

- [ ] **Step 5: Update api/src/index.ts to use router and middleware**

Replace `api/src/index.ts` with:

```typescript
import { router } from "./router";
import { handleCorsPrelight, corsHeaders } from "./middleware/cors";
import { handleError } from "./middleware/error-handler";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const preflightResponse = handleCorsPrelight(request);
    if (preflightResponse) return preflightResponse;

    try {
      const response = await router.fetch(request, env);

      // Add CORS headers to all responses
      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request))) {
        newHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return handleError(err, request);
    }
  },
};
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Verify health endpoint works**

```bash
cd api && npx wrangler dev --local &
sleep 3
curl http://localhost:8787/api/health
curl http://localhost:8787/api/nonexistent
kill %1
```

Expected:
- Health: `{"status":"ok","service":"rsimd-items-api"}`
- 404: `{"error":"Not found"}`

- [ ] **Step 8: Commit router and middleware**

```bash
git add api/src/
git commit -m "feat: Worker router with CORS, auth middleware, and error handling"
```

---

## Task 4: Auth Endpoints

**Files:**
- Create: `api/src/routes/auth.ts`
- Create: `api/src/db/queries.ts`
- Modify: `api/src/router.ts`

- [ ] **Step 1: Create api/src/db/queries.ts — prepared statement helpers**

Create `api/src/db/queries.ts`:

```typescript
import type { Env, TechnicianRow } from "../types";

export async function getTechnicianByEmail(
  db: D1Database,
  email: string
): Promise<TechnicianRow | null> {
  const result = await db
    .prepare("SELECT * FROM technicians WHERE email = ? AND is_active = 1")
    .bind(email)
    .first<TechnicianRow>();
  return result;
}

export async function getTechnicianById(
  db: D1Database,
  id: string
): Promise<TechnicianRow | null> {
  const result = await db
    .prepare("SELECT * FROM technicians WHERE id = ? AND is_active = 1")
    .bind(id)
    .first<TechnicianRow>();
  return result;
}
```

- [ ] **Step 2: Create api/src/routes/auth.ts**

Create `api/src/routes/auth.ts`:

```typescript
import { compare } from "bcryptjs";
import type { Env, AuthSession } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { getTechnicianByEmail, getTechnicianById } from "../db/queries";

export async function login(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { email, password } = body;
  if (!email || !password) {
    return errorResponse("Email and password are required", 400, request);
  }

  const technician = await getTechnicianByEmail(env.DB, email);
  if (!technician) {
    return errorResponse("Invalid email or password", 401, request);
  }

  const passwordValid = await compare(password, technician.password_hash);
  if (!passwordValid) {
    return errorResponse("Invalid email or password", 401, request);
  }

  // Generate token
  const token = `ritems_${crypto.randomUUID().replace(/-/g, "")}`;
  const session: AuthSession = {
    technician_id: technician.id,
    role: technician.role,
    name: technician.name,
    created_at: new Date().toISOString(),
  };

  // Store in KV with 24h TTL
  await env.KV.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: 86400,
  });

  return jsonResponse(
    {
      token,
      technician: {
        id: technician.id,
        name: technician.name,
        role: technician.role,
        email: technician.email,
      },
    },
    200,
    request
  );
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ritems_")) {
    const token = authHeader.slice(7);
    await env.KV.delete(`session:${token}`);
  }

  return jsonResponse({ success: true }, 200, request);
}

export async function me(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const technician = await getTechnicianById(env.DB, sessionOrError.technician_id);
  if (!technician) {
    return errorResponse("Technician not found", 404, request);
  }

  return jsonResponse(
    {
      id: technician.id,
      name: technician.name,
      role: technician.role,
      email: technician.email,
      phone: technician.phone,
      assigned_entities: JSON.parse(technician.assigned_entities),
    },
    200,
    request
  );
}
```

- [ ] **Step 3: Register auth routes in router.ts**

Replace `api/src/router.ts` with:

```typescript
import { Router } from "itty-router";
import type { Env } from "./types";
import { login, logout, me } from "./routes/auth";

const router = Router();

// Health check
router.get("/api/health", () => {
  return new Response(JSON.stringify({ status: "ok", service: "rsimd-items-api" }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Auth
router.post("/api/auth/login", (request: Request, env: Env) => login(request, env));
router.post("/api/auth/logout", (request: Request, env: Env) => logout(request, env));
router.get("/api/auth/me", (request: Request, env: Env) => me(request, env));

// 404 catch-all
router.all("*", () => {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});

export { router };
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Test login endpoint**

```bash
cd api && npx wrangler dev --local &
sleep 3

# Test login with admin credentials
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ohcs.gov.gh","password":"admin123"}'

kill %1
```

Expected: `{"token":"ritems_...","technician":{"id":"tech-admin","name":"System Administrator","role":"admin","email":"admin@ohcs.gov.gh"}}`

- [ ] **Step 6: Test me endpoint with returned token**

```bash
cd api && npx wrangler dev --local &
sleep 3

# Login first
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ohcs.gov.gh","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Get current user
curl http://localhost:8787/api/auth/me -H "Authorization: Bearer $TOKEN"

# Test without token
curl http://localhost:8787/api/auth/me

kill %1
```

Expected:
- With token: User details JSON
- Without token: `{"error":"Missing or invalid authorization token"}`

- [ ] **Step 7: Commit auth endpoints**

```bash
git add api/src/
git commit -m "feat: auth endpoints — login, logout, me with KV token storage"
```

---

## Task 5: Frontend Foundation — Auth Context, API Client, Login Page

**Files:**
- Create: `web/src/types.ts`
- Create: `web/src/lib/constants.ts`
- Create: `web/src/lib/api-client.ts`
- Create: `web/src/context/AuthContext.tsx`
- Create: `web/src/hooks/useAuth.ts`
- Create: `web/src/hooks/useApi.ts`
- Create: `web/src/pages/LoginPage.tsx`
- Create: `web/src/pages/DashboardPage.tsx`
- Create: `web/src/components/ui/Button.tsx`
- Create: `web/src/components/ui/Input.tsx`
- Create: `web/src/components/ui/Card.tsx`
- Create: `web/src/components/layout/AppShell.tsx`
- Create: `web/src/components/layout/Sidebar.tsx`
- Create: `web/src/components/layout/Header.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create web/src/types.ts**

Create `web/src/types.ts`:

```typescript
export interface Technician {
  id: string;
  name: string;
  role: "technician" | "lead" | "admin";
  email: string | null;
  phone: string | null;
  assigned_entities: string[];
}

export interface OrgEntity {
  id: string;
  name: string;
  code: string;
  type: "directorate" | "unit" | "secretariat";
  rooms: string[];
  is_active: boolean;
}

export interface Equipment {
  id: string;
  asset_tag: string;
  type: string;
  make: string | null;
  model: string | null;
  processor: string | null;
  serial_number: string | null;
  org_entity_id: string;
  room_number: string | null;
  status: "active" | "faulty" | "decommissioned" | "under_repair";
  installed_date: string | null;
  notes: string | null;
}

export interface MaintenanceCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface MaintenanceLog {
  id: string;
  equipment_id: string | null;
  technician_id: string;
  org_entity_id: string;
  maintenance_type: "condition_based" | "routine" | "corrective" | "emergency" | "predictive";
  category_id: string | null;
  room_number: string | null;
  description: string;
  resolution: string | null;
  status: "pending" | "in_progress" | "completed" | "escalated";
  photo_urls: string[];
  logged_date: string;
  quarter: number;
  month: number;
  year: number;
}

export interface Report {
  id: string;
  title: string;
  quarter: number;
  year: number;
  file_url: string | null;
  status: "draft" | "generated" | "reviewed" | "approved";
  created_at: string;
}

export interface LoginResponse {
  token: string;
  technician: Technician;
}

export type UserRole = "technician" | "lead" | "admin";
```

- [ ] **Step 2: Create web/src/lib/constants.ts**

Create `web/src/lib/constants.ts`:

```typescript
export const API_BASE = "/api";

export const COLORS = {
  green: "#006B3F",
  gold: "#FCD116",
  red: "#CE1126",
  black: "#1a1a1a",
} as const;

export const MAINTENANCE_TYPES = [
  { value: "condition_based", label: "Condition-Based" },
  { value: "routine", label: "Routine" },
  { value: "corrective", label: "Corrective" },
  { value: "emergency", label: "Emergency" },
  { value: "predictive", label: "Predictive" },
] as const;

export const EQUIPMENT_TYPES = [
  { value: "desktop", label: "Desktop" },
  { value: "laptop", label: "Laptop" },
  { value: "printer", label: "Printer" },
  { value: "scanner", label: "Scanner" },
  { value: "router", label: "Router" },
  { value: "switch", label: "Switch" },
  { value: "access_point", label: "Access Point" },
  { value: "cctv", label: "CCTV" },
  { value: "ups", label: "UPS" },
  { value: "other", label: "Other" },
] as const;

export const EQUIPMENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "faulty", label: "Faulty" },
  { value: "under_repair", label: "Under Repair" },
  { value: "decommissioned", label: "Decommissioned" },
] as const;
```

- [ ] **Step 3: Create web/src/lib/api-client.ts**

Create `web/src/lib/api-client.ts`:

```typescript
import { API_BASE } from "./constants";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error ?? "Request failed", response.status, data.details);
    }

    return data as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient();
```

- [ ] **Step 4: Create web/src/context/AuthContext.tsx**

Create `web/src/context/AuthContext.tsx`:

```tsx
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../lib/api-client";
import type { Technician, LoginResponse } from "../types";

interface AuthState {
  token: string | null;
  user: Technician | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "rsimd_items_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
  });

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    api.setToken(savedToken);
    api
      .get<Technician>("/auth/me")
      .then((user) => {
        setState({ token: savedToken, user, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        api.setToken(null);
        setState({ token: null, user: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, technician } = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });

    localStorage.setItem(TOKEN_KEY, token);
    api.setToken(token);
    setState({ token, user: technician, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Ignore logout errors
    }

    localStorage.removeItem(TOKEN_KEY);
    api.setToken(null);
    setState({ token: null, user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 5: Create web/src/hooks/useAuth.ts**

Create `web/src/hooks/useAuth.ts`:

```tsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

- [ ] **Step 6: Create web/src/hooks/useApi.ts**

Create `web/src/hooks/useApi.ts`:

```tsx
import { useState, useCallback } from "react";
import { api, ApiError } from "../lib/api-client";

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(async (method: "get" | "post" | "put" | "delete", path: string, body?: unknown) => {
    setState({ data: null, error: null, isLoading: true });
    try {
      let result: T;
      if (method === "get" || method === "delete") {
        result = await api[method]<T>(path);
      } else {
        result = await api[method]<T>(path, body);
      }
      setState({ data: result, error: null, isLoading: false });
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "An error occurred";
      setState({ data: null, error: message, isLoading: false });
      throw err;
    }
  }, []);

  return { ...state, execute };
}
```

- [ ] **Step 7: Create web/src/components/ui/Button.tsx**

Create `web/src/components/ui/Button.tsx`:

```tsx
import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variants = {
  primary: "bg-ghana-green text-white hover:bg-green-800 focus:ring-ghana-green",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400",
  danger: "bg-ghana-red text-white hover:bg-red-800 focus:ring-ghana-red",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
```

- [ ] **Step 8: Create web/src/components/ui/Input.tsx**

Create `web/src/components/ui/Input.tsx`:

```tsx
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green disabled:bg-gray-50 disabled:text-gray-500 ${error ? "border-ghana-red" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-ghana-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
```

- [ ] **Step 9: Create web/src/components/ui/Card.tsx**

Create `web/src/components/ui/Card.tsx`:

```tsx
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddings = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 10: Create web/src/components/layout/Header.tsx**

Create `web/src/components/layout/Header.tsx`:

```tsx
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="lg:hidden">
        <h1 className="text-lg font-bold text-ghana-green">RSIMD-ITEMS</h1>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 11: Create web/src/components/layout/Sidebar.tsx**

Create `web/src/components/layout/Sidebar.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["technician", "lead", "admin"] },
  { to: "/equipment", label: "Equipment", roles: ["technician", "lead", "admin"] },
  { to: "/maintenance", label: "Maintenance", roles: ["technician", "lead", "admin"] },
  { to: "/scan", label: "Scan QR", roles: ["technician", "lead", "admin"] },
  { to: "/reports", label: "Reports", roles: ["lead", "admin"] },
  { to: "/admin", label: "Admin", roles: ["admin"] },
];

export function Sidebar() {
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-gray-200 bg-white">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-ghana-green">RSIMD-ITEMS</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ghana-green text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">OHCS Ghana</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 12: Create web/src/components/layout/AppShell.tsx**

Create `web/src/components/layout/AppShell.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 13: Create web/src/pages/LoginPage.tsx**

Create `web/src/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm" padding="lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ghana-green">RSIMD-ITEMS</h1>
          <p className="text-sm text-gray-500 mt-1">OHCS Equipment Maintenance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ohcs.gov.gh"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-ghana-red text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 14: Create web/src/pages/DashboardPage.tsx — placeholder**

Create `web/src/pages/DashboardPage.tsx`:

```tsx
import { Card } from "../components/ui/Card";

export function DashboardPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <Card>
        <p className="text-gray-500">Dashboard will be built in Plan 3.</p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 15: Update web/src/App.tsx with routing and auth**

Replace `web/src/App.tsx` with:

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route index element={<DashboardPage />} />
      </Routes>
    </AppShell>
  );
}

function LoginRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;

  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
```

- [ ] **Step 16: Verify frontend compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 17: Commit frontend foundation**

```bash
git add web/src/
git commit -m "feat: frontend foundation — auth context, API client, login page, app shell with routing"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `npm install` runs clean from root
- [ ] `cd api && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx tsc --noEmit` — zero errors
- [ ] Worker health endpoint returns JSON at `localhost:8787/api/health`
- [ ] D1 has 11 org_entities, 14 categories, 1 admin user
- [ ] Login endpoint returns token for `admin@ohcs.gov.gh` / `admin123`
- [ ] Me endpoint returns user with valid token, 401 without
- [ ] Vite dev server shows login page at `localhost:5173`
- [ ] Login redirects to dashboard shell after successful auth
