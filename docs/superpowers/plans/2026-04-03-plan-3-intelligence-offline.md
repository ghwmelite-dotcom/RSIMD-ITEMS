# RSIMD-ITEMS Plan 3: Intelligence & Offline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the analytics dashboard with Recharts, automated quarterly report generation (D1 aggregation + Workers AI narratives + DOCX assembly + R2 storage), and offline-first PWA with service worker and IndexedDB sync.

**Architecture:** Dashboard API endpoints aggregate maintenance data from D1 and cache results in KV. Report generation pipeline: aggregate → AI narrative → DOCX assembly → R2 upload. PWA uses Workbox for app shell caching and IndexedDB for offline log queuing with background sync.

**Tech Stack:** Recharts (charts), Cloudflare Workers AI (Llama 3.1 70B narratives), docx npm (DOCX generation), Cloudflare R2 (file storage), Workbox (service worker), IndexedDB (offline storage)

---

## File Structure

### API — New Files

| File | Responsibility |
|------|---------------|
| `api/src/routes/dashboard.ts` | Dashboard aggregation endpoints (summary, trends, entity breakdown) |
| `api/src/routes/reports.ts` | Report CRUD + generate + download endpoints |
| `api/src/services/aggregator.ts` | D1 aggregation queries for dashboard and reports |
| `api/src/services/ai-narrator.ts` | Workers AI prompt construction and narrative generation |
| `api/src/services/report-generator.ts` | DOCX assembly using docx-js |

### Frontend — New Files

| File | Responsibility |
|------|---------------|
| `web/src/pages/DashboardPage.tsx` | Replace placeholder with full analytics dashboard |
| `web/src/components/dashboard/SummaryCards.tsx` | Top row of metric cards |
| `web/src/components/dashboard/TrendChart.tsx` | Monthly stacked bar chart |
| `web/src/components/dashboard/EntityBreakdown.tsx` | Horizontal bar chart per entity |
| `web/src/components/dashboard/CategoryRanking.tsx` | Ranked list of top categories |
| `web/src/components/dashboard/RecentActivity.tsx` | Latest 10 maintenance logs |
| `web/src/components/dashboard/EquipmentHealth.tsx` | Pie chart of equipment status |
| `web/src/pages/ReportsPage.tsx` | Report list + generate button + download |
| `web/src/components/reports/ReportList.tsx` | Table of generated reports |
| `web/src/components/reports/ReportGenerator.tsx` | Generate report modal |
| `web/src/lib/offline-store.ts` | IndexedDB wrapper for offline log storage |
| `web/src/context/OfflineContext.tsx` | Offline state provider + sync logic |
| `web/src/hooks/useOfflineSync.ts` | Hook for offline sync status |
| `web/public/sw.js` | Service worker (Workbox) |
| `web/public/manifest.json` | PWA manifest |

### Modified Files

| File | Change |
|------|--------|
| `api/src/router.ts` | Add dashboard and report routes |
| `api/src/db/queries.ts` | Add aggregation query helpers |
| `api/package.json` | Add `docx` dependency |
| `web/src/App.tsx` | Add reports route, wrap with OfflineContext |
| `web/package.json` | Add `recharts` dependency |
| `web/index.html` | Register service worker |

---

## Task 1: Dashboard Aggregation API

**Files:**
- Create: `api/src/services/aggregator.ts`
- Create: `api/src/routes/dashboard.ts`
- Modify: `api/src/router.ts`

- [ ] **Step 1: Create aggregator service**

Create `api/src/services/aggregator.ts`:

```typescript
export interface DashboardSummary {
  total: number;
  by_type: Record<string, number>;
  by_month: { month: number; count: number; by_type: Record<string, number> }[];
  by_entity: { entity_id: string; entity_code: string; entity_name: string; count: number }[];
  top_categories: { category_id: string; category_name: string; count: number }[];
  recent_logs: Array<{
    id: string; logged_date: string; maintenance_type: string;
    description: string; status: string; org_entity_code: string;
    technician_name: string;
  }>;
  equipment_status: Record<string, number>;
}

export async function getDashboardSummary(
  db: D1Database,
  year: number,
  quarter: number
): Promise<DashboardSummary> {
  const [total, byType, byMonth, byEntity, topCategories, recentLogs, equipmentStatus] = await Promise.all([
    // Total count
    db.prepare("SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ?")
      .bind(year, quarter).first<{ count: number }>(),

    // By type
    db.prepare("SELECT maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? GROUP BY maintenance_type")
      .bind(year, quarter).all<{ maintenance_type: string; count: number }>(),

    // By month with type breakdown
    db.prepare(`
      SELECT month, maintenance_type, COUNT(*) as count
      FROM maintenance_logs WHERE year = ? AND quarter = ?
      GROUP BY month, maintenance_type ORDER BY month
    `).bind(year, quarter).all<{ month: number; maintenance_type: string; count: number }>(),

    // By entity
    db.prepare(`
      SELECT ml.org_entity_id as entity_id, oe.code as entity_code, oe.name as entity_name, COUNT(*) as count
      FROM maintenance_logs ml JOIN org_entities oe ON ml.org_entity_id = oe.id
      WHERE ml.year = ? AND ml.quarter = ?
      GROUP BY ml.org_entity_id ORDER BY count DESC
    `).bind(year, quarter).all<{ entity_id: string; entity_code: string; entity_name: string; count: number }>(),

    // Top categories
    db.prepare(`
      SELECT ml.category_id, mc.name as category_name, COUNT(*) as count
      FROM maintenance_logs ml LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
      WHERE ml.year = ? AND ml.quarter = ? AND ml.category_id IS NOT NULL
      GROUP BY ml.category_id ORDER BY count DESC LIMIT 10
    `).bind(year, quarter).all<{ category_id: string; category_name: string; count: number }>(),

    // Recent logs
    db.prepare(`
      SELECT ml.id, ml.logged_date, ml.maintenance_type, ml.description, ml.status,
             oe.code as org_entity_code, t.name as technician_name
      FROM maintenance_logs ml
      JOIN org_entities oe ON ml.org_entity_id = oe.id
      JOIN technicians t ON ml.technician_id = t.id
      ORDER BY ml.created_at DESC LIMIT 10
    `).all<{
      id: string; logged_date: string; maintenance_type: string;
      description: string; status: string; org_entity_code: string; technician_name: string;
    }>(),

    // Equipment status counts
    db.prepare("SELECT status, COUNT(*) as count FROM equipment GROUP BY status")
      .all<{ status: string; count: number }>(),
  ]);

  // Transform by_month into grouped structure
  const monthMap = new Map<number, { month: number; count: number; by_type: Record<string, number> }>();
  for (const row of byMonth.results) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, { month: row.month, count: 0, by_type: {} });
    }
    const entry = monthMap.get(row.month)!;
    entry.count += row.count;
    entry.by_type[row.maintenance_type] = row.count;
  }

  return {
    total: total?.count ?? 0,
    by_type: Object.fromEntries(byType.results.map((r) => [r.maintenance_type, r.count])),
    by_month: Array.from(monthMap.values()).sort((a, b) => a.month - b.month),
    by_entity: byEntity.results,
    top_categories: topCategories.results,
    recent_logs: recentLogs.results,
    equipment_status: Object.fromEntries(equipmentStatus.results.map((r) => [r.status, r.count])),
  };
}

export interface TrendData {
  monthly: { month: number; year: number; count: number; by_type: Record<string, number> }[];
}

export async function getYearlyTrends(db: D1Database, year: number): Promise<TrendData> {
  const result = await db.prepare(`
    SELECT month, maintenance_type, COUNT(*) as count
    FROM maintenance_logs WHERE year = ?
    GROUP BY month, maintenance_type ORDER BY month
  `).bind(year).all<{ month: number; maintenance_type: string; count: number }>();

  const monthMap = new Map<number, { month: number; year: number; count: number; by_type: Record<string, number> }>();
  for (const row of result.results) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, { month: row.month, year, count: 0, by_type: {} });
    }
    const entry = monthMap.get(row.month)!;
    entry.count += row.count;
    entry.by_type[row.maintenance_type] = row.count;
  }

  return { monthly: Array.from(monthMap.values()).sort((a, b) => a.month - b.month) };
}
```

- [ ] **Step 2: Create dashboard route handler**

Create `api/src/routes/dashboard.ts`:

```typescript
import type { Env } from "../types";
import { jsonResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { getDashboardSummary, getYearlyTrends } from "../services/aggregator";

export async function dashboardSummary(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year")) || now.getFullYear();
  const quarter = Number(url.searchParams.get("quarter")) || Math.ceil((now.getMonth() + 1) / 3);

  const summary = await getDashboardSummary(env.DB, year, quarter);
  return jsonResponse(summary, 200, request);
}

export async function dashboardTrends(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();

  const trends = await getYearlyTrends(env.DB, year);
  return jsonResponse(trends, 200, request);
}
```

- [ ] **Step 3: Register dashboard routes in router.ts**

Add before the 404 catch-all in `api/src/router.ts`:

```typescript
import { dashboardSummary, dashboardTrends } from "./routes/dashboard";

// Dashboard
router.get("/api/dashboard/summary", (request: Request, env: Env) => dashboardSummary(request, env));
router.get("/api/dashboard/trends", (request: Request, env: Env) => dashboardTrends(request, env));
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Test dashboard API**

```bash
cd api && npx wrangler dev --local &
sleep 3
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@ohcs.gov.gh","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s "http://localhost:8787/api/dashboard/summary?year=2026&quarter=2" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
curl -s "http://localhost:8787/api/dashboard/trends?year=2026" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

kill %1
```

Expected: JSON with summary data (may be empty if no logs for Q2 2026).

- [ ] **Step 6: Commit**

```bash
git add api/src/
git commit -m "feat: dashboard aggregation API — summary and yearly trends endpoints"
```

---

## Task 2: Dashboard Frontend with Recharts

**Files:**
- Create: `web/src/components/dashboard/SummaryCards.tsx`
- Create: `web/src/components/dashboard/TrendChart.tsx`
- Create: `web/src/components/dashboard/EntityBreakdown.tsx`
- Create: `web/src/components/dashboard/CategoryRanking.tsx`
- Create: `web/src/components/dashboard/RecentActivity.tsx`
- Create: `web/src/components/dashboard/EquipmentHealth.tsx`
- Modify: `web/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Install recharts**

```bash
cd web && npm install recharts
```

- [ ] **Step 2: Create SummaryCards component**

Create `web/src/components/dashboard/SummaryCards.tsx`:

```tsx
import { Card } from "../ui/Card";

interface SummaryCardsProps {
  total: number;
  byType: Record<string, number>;
}

const TYPE_LABELS: Record<string, string> = {
  condition_based: "Condition-Based",
  routine: "Routine",
  corrective: "Corrective",
  emergency: "Emergency",
  predictive: "Predictive",
};

const TYPE_COLORS: Record<string, string> = {
  condition_based: "text-blue-600",
  routine: "text-ghana-green",
  corrective: "text-orange-600",
  emergency: "text-ghana-red",
  predictive: "text-purple-600",
};

export function SummaryCards({ total, byType }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card padding="sm">
        <p className="text-xs text-gray-500 uppercase">Total</p>
        <p className="text-2xl font-bold text-ghana-black mt-1">{total}</p>
      </Card>
      {Object.entries(TYPE_LABELS).map(([key, label]) => (
        <Card padding="sm" key={key}>
          <p className="text-xs text-gray-500 uppercase">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${TYPE_COLORS[key] ?? "text-gray-900"}`}>
            {byType[key] ?? 0}
          </p>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create TrendChart component**

Create `web/src/components/dashboard/TrendChart.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TrendChartProps {
  data: { month: number; by_type: Record<string, number> }[];
}

export function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map((d) => ({
    name: MONTH_NAMES[d.month - 1] ?? `M${d.month}`,
    routine: d.by_type.routine ?? 0,
    corrective: d.by_type.corrective ?? 0,
    emergency: d.by_type.emergency ?? 0,
    condition_based: d.by_type.condition_based ?? 0,
    predictive: d.by_type.predictive ?? 0,
  }));

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="routine" name="Routine" fill="#006B3F" stackId="a" />
          <Bar dataKey="corrective" name="Corrective" fill="#F97316" stackId="a" />
          <Bar dataKey="emergency" name="Emergency" fill="#CE1126" stackId="a" />
          <Bar dataKey="condition_based" name="Condition-Based" fill="#3B82F6" stackId="a" />
          <Bar dataKey="predictive" name="Predictive" fill="#8B5CF6" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 4: Create EntityBreakdown component**

Create `web/src/components/dashboard/EntityBreakdown.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";

interface EntityBreakdownProps {
  data: { entity_code: string; entity_name: string; count: number }[];
}

export function EntityBreakdown({ data }: EntityBreakdownProps) {
  const chartData = data.map((d) => ({ name: d.entity_code, count: d.count, fullName: d.entity_name }));

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">By Directorate/Unit</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={60} />
          <Tooltip formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [value, props.payload.fullName]} />
          <Bar dataKey="count" fill="#006B3F" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 5: Create CategoryRanking component**

Create `web/src/components/dashboard/CategoryRanking.tsx`:

```tsx
import { Card } from "../ui/Card";

interface CategoryRankingProps {
  data: { category_name: string; count: number }[];
}

export function CategoryRanking({ data }: CategoryRankingProps) {
  const max = data[0]?.count ?? 1;

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Issue Categories</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No data</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, i) => (
            <div key={item.category_name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{i + 1}. {item.category_name}</span>
                <span className="font-medium">{item.count}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ghana-green rounded-full transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 6: Create RecentActivity component**

Create `web/src/components/dashboard/RecentActivity.tsx`:

```tsx
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";

interface RecentActivityProps {
  data: Array<{
    id: string; logged_date: string; maintenance_type: string;
    description: string; status: string; org_entity_code: string;
    technician_name: string;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  condition_based: "Condition-Based",
  routine: "Routine",
  corrective: "Corrective",
  emergency: "Emergency",
  predictive: "Predictive",
};

export function RecentActivity({ data }: RecentActivityProps) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {data.map((log) => (
            <div key={log.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{log.logged_date} — {log.org_entity_code}</span>
                <StatusPill status={log.status} />
              </div>
              <p className="text-sm text-gray-900">{log.description.length > 80 ? log.description.slice(0, 80) + "..." : log.description}</p>
              <p className="text-xs text-gray-400 mt-1">{TYPE_LABELS[log.maintenance_type] ?? log.maintenance_type} — {log.technician_name}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 7: Create EquipmentHealth component**

Create `web/src/components/dashboard/EquipmentHealth.tsx`:

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card } from "../ui/Card";

interface EquipmentHealthProps {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#006B3F",
  faulty: "#CE1126",
  under_repair: "#FCD116",
  decommissioned: "#9CA3AF",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  faulty: "Faulty",
  under_repair: "Under Repair",
  decommissioned: "Decommissioned",
};

export function EquipmentHealth({ data }: EquipmentHealthProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status] ?? status,
    value: count,
    color: STATUS_COLORS[status] ?? "#9CA3AF",
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Equipment Health</h3>
        <p className="text-sm text-gray-500">No equipment registered</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Equipment Health</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 8: Replace DashboardPage**

Replace `web/src/pages/DashboardPage.tsx` with:

```tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { Select } from "../components/ui/Select";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { TrendChart } from "../components/dashboard/TrendChart";
import { EntityBreakdown } from "../components/dashboard/EntityBreakdown";
import { CategoryRanking } from "../components/dashboard/CategoryRanking";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { EquipmentHealth } from "../components/dashboard/EquipmentHealth";

interface DashboardData {
  total: number;
  by_type: Record<string, number>;
  by_month: { month: number; count: number; by_type: Record<string, number> }[];
  by_entity: { entity_id: string; entity_code: string; entity_name: string; count: number }[];
  top_categories: { category_id: string; category_name: string; count: number }[];
  recent_logs: Array<{
    id: string; logged_date: string; maintenance_type: string;
    description: string; status: string; org_entity_code: string;
    technician_name: string;
  }>;
  equipment_status: Record<string, number>;
}

const currentYear = new Date().getFullYear();
const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

const QUARTER_OPTIONS = [
  { value: "1", label: "Q1 (Jan–Mar)" },
  { value: "2", label: "Q2 (Apr–Jun)" },
  { value: "3", label: "Q3 (Jul–Sep)" },
  { value: "4", label: "Q4 (Oct–Dec)" },
];

export function DashboardPage() {
  const { showToast } = useToast();
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState(String(currentQuarter));
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get<DashboardData>(`/dashboard/summary?year=${year}&quarter=${quarter}`)
      .then(setData)
      .catch(() => showToast("error", "Failed to load dashboard"))
      .finally(() => setIsLoading(false));
  }, [year, quarter, showToast]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex gap-3">
          <Select
            options={[{ value: String(currentYear), label: String(currentYear) }, { value: String(currentYear - 1), label: String(currentYear - 1) }]}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <Select options={QUARTER_OPTIONS} value={quarter} onChange={(e) => setQuarter(e.target.value)} />
        </div>
      </div>

      <SummaryCards total={data.total} byType={data.by_type} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart data={data.by_month} />
        <EntityBreakdown data={data.by_entity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryRanking data={data.top_categories} />
        <RecentActivity data={data.recent_logs} />
        <EquipmentHealth data={data.equipment_status} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Verify TypeScript compiles and builds**

```bash
cd web && npx tsc --noEmit && npx vite build
```

- [ ] **Step 10: Commit**

```bash
git add web/
git commit -m "feat: analytics dashboard with Recharts — summary cards, trends, entity breakdown, categories, equipment health"
```

---

## Task 3: Report Generation API (Aggregation + AI Narratives + DOCX)

**Files:**
- Create: `api/src/services/ai-narrator.ts`
- Create: `api/src/services/report-generator.ts`
- Create: `api/src/routes/reports.ts`
- Modify: `api/src/router.ts`
- Modify: `api/package.json`

- [ ] **Step 1: Install docx package**

```bash
cd api && npm install docx
```

- [ ] **Step 2: Create AI narrator service**

Create `api/src/services/ai-narrator.ts`:

```typescript
interface NarrativeRequest {
  section: string;
  quarter: number;
  year: number;
  data: unknown;
}

const SYSTEM_PROMPT = `You are writing a formal quarterly IT equipment maintenance report for the Office of the Head of Civil Service (OHCS), Ghana. The report is produced by the Research, Statistics & Information Management Directorate (RSIMD). Write in formal British English as used in Ghana government documents. Be precise with numbers — use the exact figures provided. Do not invent statistics. Keep each section to 1-2 paragraphs.`;

export async function generateNarrative(
  ai: Ai,
  request: NarrativeRequest
): Promise<string> {
  const quarterNames = ["First", "Second", "Third", "Fourth"];
  const quarterName = quarterNames[request.quarter - 1] ?? `Q${request.quarter}`;

  const userPrompt = `Generate the "${request.section}" section for the ${quarterName} Quarter ${request.year} Equipment Maintenance Report.\n\nData:\n${JSON.stringify(request.data, null, 2)}`;

  const response = await ai.run("@cf/meta/llama-3.1-70b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 1024,
  });

  if ("response" in response && typeof response.response === "string") {
    return response.response;
  }

  return "Section content could not be generated.";
}

export async function generateAllNarratives(
  ai: Ai,
  quarter: number,
  year: number,
  aggregatedData: {
    total: number;
    byType: Record<string, number>;
    routineByCategory: Array<{ category: string; months: Record<number, number>; total: number }>;
    correctiveSummary: Array<{ category: string; count: number }>;
    correctiveByEntity: Array<{ entity: string; room: string; issues: number }>;
    emergencyByCategory: Array<{ category: string; months: Record<number, number>; total: number }>;
    conditionBasedCount: number;
    predictiveCount: number;
    challenges: string[];
    recommendations: string[];
  }
): Promise<{
  introduction: string;
  methodology: string;
  conditionBased: string;
  routineNarrative: string;
  correctiveNarrative: string;
  emergencyNarrative: string;
  predictive: string;
  challenges: string;
  recommendations: string;
  conclusion: string;
}> {
  const [introduction, methodology, conditionBased, routineNarrative, correctiveNarrative, emergencyNarrative, predictive, challenges, recommendations, conclusion] = await Promise.all([
    generateNarrative(ai, { section: "1.0 Introduction", quarter, year, data: { total_activities: aggregatedData.total, by_type: aggregatedData.byType } }),
    generateNarrative(ai, { section: "2.0 Methodology", quarter, year, data: { maintenance_types: Object.keys(aggregatedData.byType) } }),
    generateNarrative(ai, { section: "3.1 Condition-Based Servicing and Monitoring", quarter, year, data: { count: aggregatedData.conditionBasedCount } }),
    generateNarrative(ai, { section: "3.2 Routine Maintenance narrative", quarter, year, data: { categories: aggregatedData.routineByCategory } }),
    generateNarrative(ai, { section: "3.3 Corrective Maintenance narrative", quarter, year, data: { summary: aggregatedData.correctiveSummary, by_entity: aggregatedData.correctiveByEntity } }),
    generateNarrative(ai, { section: "3.4 Emergency Maintenance narrative", quarter, year, data: { categories: aggregatedData.emergencyByCategory } }),
    generateNarrative(ai, { section: "3.5 Predictive Maintenance", quarter, year, data: { count: aggregatedData.predictiveCount } }),
    generateNarrative(ai, { section: "4.0 Challenges", quarter, year, data: { issues: aggregatedData.challenges } }),
    generateNarrative(ai, { section: "5.0 Recommendations", quarter, year, data: { suggestions: aggregatedData.recommendations } }),
    generateNarrative(ai, { section: "6.0 Conclusion", quarter, year, data: { total: aggregatedData.total, by_type: aggregatedData.byType } }),
  ]);

  return { introduction, methodology, conditionBased, routineNarrative, correctiveNarrative, emergencyNarrative, predictive, challenges, recommendations, conclusion };
}
```

- [ ] **Step 3: Create report aggregation queries**

Add to `api/src/services/aggregator.ts`:

```typescript
export interface ReportAggregation {
  total: number;
  byType: Record<string, number>;
  routineByCategory: Array<{ category: string; months: Record<number, number>; total: number }>;
  correctiveSummary: Array<{ category: string; count: number }>;
  correctiveByEntity: Array<{ entity: string; room: string; issues: number }>;
  emergencyByCategory: Array<{ category: string; months: Record<number, number>; total: number }>;
  conditionBasedCount: number;
  predictiveCount: number;
  challenges: string[];
  recommendations: string[];
}

export async function getReportAggregation(db: D1Database, year: number, quarter: number): Promise<ReportAggregation> {
  const startMonth = (quarter - 1) * 3 + 1;
  const months = [startMonth, startMonth + 1, startMonth + 2];

  const [totalResult, byTypeResult, routineResult, correctiveSummaryResult, correctiveByEntityResult, emergencyResult, conditionResult, predictiveResult] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ?").bind(year, quarter).first<{ count: number }>(),
    db.prepare("SELECT maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? GROUP BY maintenance_type").bind(year, quarter).all<{ maintenance_type: string; count: number }>(),
    db.prepare(`
      SELECT mc.name as category, ml.month, COUNT(*) as count
      FROM maintenance_logs ml LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
      WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'routine'
      GROUP BY ml.category_id, ml.month ORDER BY mc.name, ml.month
    `).bind(year, quarter).all<{ category: string; month: number; count: number }>(),
    db.prepare(`
      SELECT mc.name as category, COUNT(*) as count
      FROM maintenance_logs ml LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
      WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'corrective'
      GROUP BY ml.category_id ORDER BY count DESC
    `).bind(year, quarter).all<{ category: string; count: number }>(),
    db.prepare(`
      SELECT oe.name as entity, ml.room_number as room, COUNT(*) as issues
      FROM maintenance_logs ml JOIN org_entities oe ON ml.org_entity_id = oe.id
      WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'corrective'
      GROUP BY ml.org_entity_id, ml.room_number ORDER BY issues DESC
    `).bind(year, quarter).all<{ entity: string; room: string; issues: number }>(),
    db.prepare(`
      SELECT mc.name as category, ml.month, COUNT(*) as count
      FROM maintenance_logs ml LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
      WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type = 'emergency'
      GROUP BY ml.category_id, ml.month ORDER BY mc.name, ml.month
    `).bind(year, quarter).all<{ category: string; month: number; count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? AND maintenance_type = 'condition_based'").bind(year, quarter).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? AND maintenance_type = 'predictive'").bind(year, quarter).first<{ count: number }>(),
  ]);

  // Pivot routine data: category -> { months: {m1: n, m2: n, m3: n}, total }
  const routineMap = new Map<string, { category: string; months: Record<number, number>; total: number }>();
  for (const row of routineResult.results) {
    const cat = row.category ?? "Uncategorized";
    if (!routineMap.has(cat)) routineMap.set(cat, { category: cat, months: {}, total: 0 });
    const entry = routineMap.get(cat)!;
    entry.months[row.month] = row.count;
    entry.total += row.count;
  }

  // Same pivot for emergency
  const emergencyMap = new Map<string, { category: string; months: Record<number, number>; total: number }>();
  for (const row of emergencyResult.results) {
    const cat = row.category ?? "Uncategorized";
    if (!emergencyMap.has(cat)) emergencyMap.set(cat, { category: cat, months: {}, total: 0 });
    const entry = emergencyMap.get(cat)!;
    entry.months[row.month] = row.count;
    entry.total += row.count;
  }

  return {
    total: totalResult?.count ?? 0,
    byType: Object.fromEntries(byTypeResult.results.map((r) => [r.maintenance_type, r.count])),
    routineByCategory: Array.from(routineMap.values()),
    correctiveSummary: correctiveSummaryResult.results,
    correctiveByEntity: correctiveByEntityResult.results,
    emergencyByCategory: Array.from(emergencyMap.values()),
    conditionBasedCount: conditionResult?.count ?? 0,
    predictiveCount: predictiveResult?.count ?? 0,
    challenges: [],
    recommendations: [],
  };
}
```

- [ ] **Step 4: Create report generator (DOCX assembly)**

Create `api/src/services/report-generator.ts`:

```typescript
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle,
  TableOfContents,
} from "docx";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const QUARTER_NAMES = ["FIRST", "SECOND", "THIRD", "FOURTH"];

interface ReportContent {
  quarter: number;
  year: number;
  narratives: {
    introduction: string; methodology: string; conditionBased: string;
    routineNarrative: string; correctiveNarrative: string; emergencyNarrative: string;
    predictive: string; challenges: string; recommendations: string; conclusion: string;
  };
  tables: {
    routineByCategory: Array<{ category: string; months: Record<number, number>; total: number }>;
    correctiveSummary: Array<{ category: string; count: number }>;
    correctiveByEntity: Array<{ entity: string; room: string; issues: number }>;
    emergencyByCategory: Array<{ category: string; months: Record<number, number>; total: number }>;
  };
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: "Arial" })] })],
    shading: { fill: "D9E2F3" },
    width: { size: 2000, type: WidthType.DXA },
  });
}

function cell(text: string | number): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20, font: "Arial" })] })],
    width: { size: 2000, type: WidthType.DXA },
  });
}

function buildMonthlyTable(
  data: Array<{ category: string; months: Record<number, number>; total: number }>,
  startMonth: number
): Table {
  const m1 = MONTH_NAMES[startMonth - 1]!;
  const m2 = MONTH_NAMES[startMonth]!;
  const m3 = MONTH_NAMES[startMonth + 1]!;

  const headerRow = new TableRow({
    children: [headerCell("Description"), headerCell(m1), headerCell(m2), headerCell(m3), headerCell("Total")],
  });

  const dataRows = data.map((row) => new TableRow({
    children: [
      cell(row.category),
      cell(row.months[startMonth] ?? 0),
      cell(row.months[startMonth + 1] ?? 0),
      cell(row.months[startMonth + 2] ?? 0),
      cell(row.total),
    ],
  }));

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9000, type: WidthType.DXA },
  });
}

export async function generateDocx(content: ReportContent): Promise<Uint8Array> {
  const startMonth = (content.quarter - 1) * 3 + 1;
  const m1Name = MONTH_NAMES[startMonth - 1]!;
  const m3Name = MONTH_NAMES[startMonth + 1]!;
  const quarterLabel = QUARTER_NAMES[content.quarter - 1] ?? `Q${content.quarter}`;

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 24 } },
      },
    },
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 } },
      },
      children: [
        // Title block
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "RESEARCH, STATISTICS, AND INFORMATION MANAGEMENT DIRECTORATE (RSIMD)", bold: true, size: 28, font: "Arial" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `${quarterLabel} QUARTER EQUIPMENT MAINTENANCE REPORT`, bold: true, size: 28, font: "Arial" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: `(${m1Name} – ${m3Name}, ${content.year})`, size: 24, font: "Arial" })] }),

        // 1.0 Introduction
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1.0 INTRODUCTION", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.introduction, font: "Arial" })] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "1.1 OBJECTIVES", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: "To document all IT equipment maintenance activities carried out during the quarter, assess the condition of equipment, and provide recommendations for improved service delivery.", font: "Arial" })] }),

        // 2.0 Methodology
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400 }, children: [new TextRun({ text: "2.0 METHODOLOGY", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.methodology, font: "Arial" })] }),

        // 3.0 Details
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400 }, children: [new TextRun({ text: "3.0 DETAILS OF MAINTENANCE AND SERVICING", bold: true })] }),

        // 3.1 Condition-Based
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "3.1 Condition-Based Servicing and Monitoring", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.conditionBased, font: "Arial" })] }),

        // 3.2 Routine
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "3.2 Routine Maintenance and Servicing", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.routineNarrative, font: "Arial" })] }),
        new Paragraph({ spacing: { before: 200 } }),
        buildMonthlyTable(content.tables.routineByCategory, startMonth),

        // 3.3 Corrective
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "3.3 Corrective Maintenance", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.correctiveNarrative, font: "Arial" })] }),
        new Paragraph({ spacing: { before: 200 } }),
        new Table({
          rows: [
            new TableRow({ children: [headerCell("Description"), headerCell("Quantity")] }),
            ...content.tables.correctiveSummary.map((row) => new TableRow({ children: [cell(row.category), cell(row.count)] })),
          ],
          width: { size: 6000, type: WidthType.DXA },
        }),
        new Paragraph({ spacing: { before: 200 } }),
        new Table({
          rows: [
            new TableRow({ children: [headerCell("Directorate/Unit"), headerCell("Room"), headerCell("Issues")] }),
            ...content.tables.correctiveByEntity.map((row) => new TableRow({ children: [cell(row.entity), cell(row.room ?? "—"), cell(row.issues)] })),
          ],
          width: { size: 9000, type: WidthType.DXA },
        }),

        // 3.4 Emergency
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "3.4 Emergency Maintenance", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.emergencyNarrative, font: "Arial" })] }),
        new Paragraph({ spacing: { before: 200 } }),
        buildMonthlyTable(content.tables.emergencyByCategory, startMonth),

        // 3.5 Predictive
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "3.5 Predictive Maintenance", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.predictive, font: "Arial" })] }),

        // 4.0 Challenges
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400 }, children: [new TextRun({ text: "4.0 CHALLENGES", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.challenges, font: "Arial" })] }),

        // 5.0 Recommendations
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400 }, children: [new TextRun({ text: "5.0 RECOMMENDATIONS", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.recommendations, font: "Arial" })] }),

        // 6.0 Conclusion
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400 }, children: [new TextRun({ text: "6.0 CONCLUSION", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: content.narratives.conclusion, font: "Arial" })] }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
```

- [ ] **Step 5: Create reports route handler**

Create `api/src/routes/reports.ts`:

```typescript
import type { Env, ReportRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { getReportAggregation } from "../services/aggregator";
import { generateAllNarratives } from "../services/ai-narrator";
import { generateDocx } from "../services/report-generator";

export async function listReports(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const result = await env.DB.prepare("SELECT * FROM reports ORDER BY year DESC, quarter DESC").all<ReportRow>();
  return jsonResponse(result.results, 200, request);
}

export async function getReport(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const report = await env.DB.prepare("SELECT * FROM reports WHERE id = ?").bind(id).first<ReportRow>();
  if (!report) return errorResponse("Report not found", 404, request);

  return jsonResponse(report, 200, request);
}

export async function generateReport(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "lead", "admin");
  if (roleError) return roleError;

  let body: { year?: number; quarter?: number };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  const year = body.year ?? new Date().getFullYear();
  const quarter = body.quarter ?? Math.ceil((new Date().getMonth() + 1) / 3);

  if (quarter < 1 || quarter > 4) return errorResponse("Quarter must be 1-4", 400, request);

  const quarterNames = ["First", "Second", "Third", "Fourth"];
  const title = `${quarterNames[quarter - 1]} Quarter ${year} Equipment Maintenance Report`;

  // Create report record
  const reportId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO reports (id, title, quarter, year, generated_by, status, ai_model) VALUES (?, ?, ?, ?, ?, 'draft', '@cf/meta/llama-3.1-70b-instruct')"
  ).bind(reportId, title, quarter, year, sessionOrError.technician_id).run();

  try {
    // 1. Aggregate data
    const aggregation = await getReportAggregation(env.DB, year, quarter);

    // 2. Generate AI narratives
    const narratives = await generateAllNarratives(env.AI, quarter, year, aggregation);

    // 3. Generate DOCX
    const docxBuffer = await generateDocx({
      quarter, year, narratives,
      tables: {
        routineByCategory: aggregation.routineByCategory,
        correctiveSummary: aggregation.correctiveSummary,
        correctiveByEntity: aggregation.correctiveByEntity,
        emergencyByCategory: aggregation.emergencyByCategory,
      },
    });

    // 4. Upload to R2
    const fileName = `reports/${year}-Q${quarter}-${reportId}.docx`;
    await env.R2.put(fileName, docxBuffer, {
      httpMetadata: { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    });

    // 5. Update report record
    await env.DB.prepare(
      "UPDATE reports SET file_url = ?, file_size = ?, status = 'generated', generation_log = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(fileName, docxBuffer.byteLength, JSON.stringify({ sections_generated: Object.keys(narratives).length }), reportId).run();

    const report = await env.DB.prepare("SELECT * FROM reports WHERE id = ?").bind(reportId).first<ReportRow>();
    return jsonResponse(report, 201, request);

  } catch (err) {
    // Update report status to reflect failure
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await env.DB.prepare(
      "UPDATE reports SET status = 'draft', generation_log = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(JSON.stringify({ error: errorMsg }), reportId).run();

    return errorResponse(`Report generation failed: ${errorMsg}`, 500, request);
  }
}

export async function downloadReport(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const report = await env.DB.prepare("SELECT * FROM reports WHERE id = ?").bind(id).first<ReportRow>();
  if (!report || !report.file_url) return errorResponse("Report file not found", 404, request);

  const file = await env.R2.get(report.file_url);
  if (!file) return errorResponse("File not found in storage", 404, request);

  return new Response(file.body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${report.title.replace(/[^a-zA-Z0-9 ]/g, "")}.docx"`,
      "Content-Length": String(report.file_size ?? 0),
    },
  });
}
```

- [ ] **Step 6: Register report routes in router.ts**

Add before the 404 catch-all:

```typescript
import { listReports, getReport, generateReport, downloadReport } from "./routes/reports";
import { dashboardSummary, dashboardTrends } from "./routes/dashboard";

// Reports
router.get("/api/reports", (request: Request, env: Env) => listReports(request, env));
router.post("/api/reports/generate", (request: Request, env: Env) => generateReport(request, env));
router.get("/api/reports/:id/download", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return downloadReport(request, env, id);
});
router.get("/api/reports/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return getReport(request, env, id);
});
```

**Important:** `/api/reports/generate` and `/api/reports/:id/download` must be before `/api/reports/:id`.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add api/
git commit -m "feat: report generation — D1 aggregation, Workers AI narratives, DOCX assembly, R2 storage"
```

---

## Task 4: Reports Frontend Page

**Files:**
- Create: `web/src/components/reports/ReportList.tsx`
- Create: `web/src/components/reports/ReportGenerator.tsx`
- Create: `web/src/pages/ReportsPage.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create ReportList component**

Create `web/src/components/reports/ReportList.tsx`:

```tsx
import { api } from "../../lib/api-client";
import { Button } from "../ui/Button";
import { Table } from "../ui/Table";
import { StatusPill } from "../ui/StatusPill";
import type { Report } from "../../types";

interface ReportListProps {
  reports: Report[];
}

export function ReportList({ reports }: ReportListProps) {
  async function handleDownload(report: Report) {
    const response = await fetch(`/api/reports/${report.id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("rsimd_items_token")}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: "title", header: "Report" },
    { key: "quarter", header: "Quarter", render: (r: Report) => `Q${r.quarter} ${r.year}` },
    { key: "status", header: "Status", render: (r: Report) => <StatusPill status={r.status} /> },
    { key: "created_at", header: "Generated", render: (r: Report) => r.created_at?.slice(0, 10) ?? "—" },
    { key: "actions", header: "", render: (r: Report) => r.file_url ? (
      <Button size="sm" variant="secondary" onClick={() => handleDownload(r)}>Download</Button>
    ) : null },
  ];

  return <Table columns={columns} data={reports} keyField="id" emptyMessage="No reports generated yet" />;
}
```

- [ ] **Step 2: Create ReportGenerator component**

Create `web/src/components/reports/ReportGenerator.tsx`:

```tsx
import { useState } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";

interface ReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

const currentYear = new Date().getFullYear();

export function ReportGenerator({ isOpen, onClose, onGenerated }: ReportGeneratorProps) {
  const { showToast } = useToast();
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState(String(Math.ceil((new Date().getMonth() + 1) / 3)));
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await api.post("/reports/generate", { year: Number(year), quarter: Number(quarter) });
      showToast("success", "Report generated successfully");
      onGenerated();
      onClose();
    } catch {
      showToast("error", "Report generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Quarterly Report" size="sm">
      <div className="space-y-4">
        <Select
          label="Year"
          options={[{ value: String(currentYear), label: String(currentYear) }, { value: String(currentYear - 1), label: String(currentYear - 1) }]}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <Select
          label="Quarter"
          options={[
            { value: "1", label: "Q1 (January – March)" },
            { value: "2", label: "Q2 (April – June)" },
            { value: "3", label: "Q3 (July – September)" },
            { value: "4", label: "Q4 (October – December)" },
          ]}
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
        />
        <p className="text-sm text-gray-500">
          This will aggregate all maintenance data for the selected quarter and generate a DOCX report with AI-written narratives. This may take 30-60 seconds.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} isLoading={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Create ReportsPage**

Create `web/src/pages/ReportsPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ReportList } from "../components/reports/ReportList";
import { ReportGenerator } from "../components/reports/ReportGenerator";
import type { Report } from "../types";

export function ReportsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Report[]>("/reports");
      setReports(data);
    } catch {
      showToast("error", "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const canGenerate = user?.role === "lead" || user?.role === "admin";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Quarterly Reports</h2>
        {canGenerate && <Button onClick={() => setShowGenerator(true)}>Generate Report</Button>}
      </div>
      <Card padding="sm">
        {isLoading ? (
          <p className="p-4 text-sm text-gray-500">Loading...</p>
        ) : (
          <ReportList reports={reports} />
        )}
      </Card>
      <ReportGenerator isOpen={showGenerator} onClose={() => setShowGenerator(false)} onGenerated={loadReports} />
    </div>
  );
}
```

- [ ] **Step 4: Add reports route to App.tsx**

Add to imports:
```tsx
import { ReportsPage } from "./pages/ReportsPage";
```

Add inside ProtectedRoutes `<Routes>`:
```tsx
<Route path="reports" element={<ReportsPage />} />
```

- [ ] **Step 5: Verify TypeScript compiles and builds**

```bash
cd web && npx tsc --noEmit && npx vite build
```

- [ ] **Step 6: Commit**

```bash
git add web/
git commit -m "feat: reports page — list generated reports, generate new with year/quarter selector, download DOCX"
```

---

## Task 5: Offline PWA (Service Worker, IndexedDB, Manifest)

**Files:**
- Create: `web/src/lib/offline-store.ts`
- Create: `web/src/context/OfflineContext.tsx`
- Create: `web/src/hooks/useOfflineSync.ts`
- Create: `web/public/manifest.json`
- Create: `web/public/sw.js`
- Modify: `web/index.html`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create IndexedDB offline store**

Create `web/src/lib/offline-store.ts`:

```typescript
const DB_NAME = "rsimd_items_offline";
const DB_VERSION = 1;
const PENDING_LOGS_STORE = "pending_logs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PENDING_LOGS_STORE)) {
        db.createObjectStore(PENDING_LOGS_STORE, { keyPath: "id" });
      }
    };
  });
}

export interface PendingLog {
  id: string;
  equipment_id: string | null;
  org_entity_id: string;
  maintenance_type: string;
  category_id: string | null;
  room_number: string | null;
  description: string;
  resolution: string | null;
  status: string;
  logged_date: string;
  created_at: string;
}

export async function savePendingLog(log: PendingLog): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_LOGS_STORE, "readwrite");
    tx.objectStore(PENDING_LOGS_STORE).put(log);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingLogs(): Promise<PendingLog[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_LOGS_STORE, "readonly");
    const request = tx.objectStore(PENDING_LOGS_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingLogs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_LOGS_STORE, "readwrite");
    tx.objectStore(PENDING_LOGS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_LOGS_STORE, "readonly");
    const request = tx.objectStore(PENDING_LOGS_STORE).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

- [ ] **Step 2: Create OfflineContext**

Create `web/src/context/OfflineContext.tsx`:

```tsx
import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../lib/api-client";
import { getPendingLogs, clearPendingLogs, getPendingCount, savePendingLog, type PendingLog } from "../lib/offline-store";
import { useToast } from "../hooks/useToast";

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  syncPending: () => Promise<void>;
  saveOfflineLog: (log: Omit<PendingLog, "id" | "created_at">) => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
  }, []);

  const saveOfflineLog = useCallback(async (log: Omit<PendingLog, "id" | "created_at">) => {
    const pendingLog: PendingLog = {
      ...log,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await savePendingLog(pendingLog);
    const count = await getPendingCount();
    setPendingCount(count);
    showToast("info", "Log saved offline. Will sync when online.");
  }, [showToast]);

  const syncPending = useCallback(async () => {
    const logs = await getPendingLogs();
    if (logs.length === 0) return;

    try {
      const syncLogs = logs.map((l) => ({
        equipment_id: l.equipment_id,
        org_entity_id: l.org_entity_id,
        maintenance_type: l.maintenance_type,
        category_id: l.category_id,
        room_number: l.room_number,
        description: l.description,
        resolution: l.resolution,
        status: l.status,
        logged_date: l.logged_date,
      }));

      await api.post("/maintenance/bulk-sync", { logs: syncLogs });
      await clearPendingLogs();
      setPendingCount(0);
      showToast("success", `Synced ${logs.length} offline log${logs.length > 1 ? "s" : ""}`);
    } catch {
      showToast("error", "Failed to sync offline logs");
    }
  }, [showToast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending();
    }
  }, [isOnline, pendingCount, syncPending]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncPending, saveOfflineLog }}>
      {children}
    </OfflineContext.Provider>
  );
}
```

- [ ] **Step 3: Create useOfflineSync hook**

Create `web/src/hooks/useOfflineSync.ts`:

```tsx
import { useContext } from "react";
import { OfflineContext } from "../context/OfflineContext";

export function useOfflineSync() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineProvider");
  }
  return context;
}
```

- [ ] **Step 4: Create PWA manifest**

Create `web/public/manifest.json`:

```json
{
  "name": "RSIMD-ITEMS — OHCS Equipment Maintenance",
  "short_name": "RSIMD-ITEMS",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#006B3F",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 5: Create service worker**

Create `web/public/sw.js`:

```javascript
const CACHE_NAME = "rsimd-items-v1";
const STATIC_ASSETS = ["/", "/index.html"];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: network only (offline handling done via IndexedDB in app)
  if (url.pathname.startsWith("/api")) {
    return;
  }

  // Static assets: cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match("/index.html"))
  );
});
```

- [ ] **Step 6: Create placeholder icon directory**

```bash
mkdir -p "web/public/icons"
```

Create a simple SVG icon placeholder (will be replaced with real icons):

```bash
# We'll generate simple placeholder icons using a canvas script later
# For now just create the directory
```

- [ ] **Step 7: Update index.html — add manifest and service worker registration**

Add to `<head>` of `web/index.html`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

Add before `</body>`:

```html
<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
</script>
```

- [ ] **Step 8: Wrap App with OfflineProvider and add online status to Header**

Update `web/src/App.tsx` to wrap with `OfflineProvider` (inside `ToastProvider`, since OfflineContext uses useToast):

```tsx
import { OfflineProvider } from "./context/OfflineContext";

// In App():
<AuthProvider>
  <ToastProvider>
    <OfflineProvider>
      <Routes>...</Routes>
    </OfflineProvider>
  </ToastProvider>
</AuthProvider>
```

Update `web/src/components/layout/Header.tsx` to show offline status and pending count:

Add to Header imports and render:
```tsx
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { Badge } from "../ui/Badge";

// Inside Header component:
const { isOnline, pendingCount, syncPending } = useOfflineSync();

// Add before the user info div:
{!isOnline && <Badge variant="red">Offline</Badge>}
{pendingCount > 0 && (
  <button onClick={syncPending} className="text-xs text-ghana-gold hover:underline">
    {pendingCount} pending
  </button>
)}
```

- [ ] **Step 9: Verify TypeScript compiles and builds**

```bash
cd web && npx tsc --noEmit && npx vite build
```

- [ ] **Step 10: Commit**

```bash
git add web/
git commit -m "feat: offline PWA — service worker, IndexedDB storage, manifest, auto-sync on reconnect"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `cd api && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx vite build` — builds successfully
- [ ] Dashboard API returns aggregated data for a given year/quarter
- [ ] Dashboard page shows summary cards, trend chart, entity breakdown, category ranking, recent activity, equipment health
- [ ] Year/quarter selectors filter the dashboard data
- [ ] Report generation endpoint creates DOCX with AI narratives and uploads to R2
- [ ] Reports page lists generated reports with download button
- [ ] Download button saves DOCX file
- [ ] Only lead/admin users see the "Generate Report" button
- [ ] Service worker registers and caches static assets
- [ ] PWA manifest is served at /manifest.json
- [ ] Offline indicator shows in header when disconnected
- [ ] Pending logs count shows when logs are queued offline
- [ ] Auto-sync fires when connection is restored
