# Phase 3: Dashboard Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the dashboard with quarter-over-quarter comparison deltas, entity drill-down page, anomaly detection alerts, Win11 readiness widget, and equipment risk summary.

**Architecture:** API aggregator service gains previous-quarter comparison and anomaly detection. New entity detail endpoint. Frontend adds new dashboard components and a drill-down page.

**Tech Stack:** Cloudflare Workers D1 (aggregation queries), React 18 + Tailwind + Recharts

---

## Task 1: API — Previous Quarter + Anomalies + Entity Detail

**Files:**
- Modify: `api/src/services/aggregator.ts`
- Modify: `api/src/routes/dashboard.ts`
- Modify: `api/src/router.ts`

- [ ] **Step 1: Add previous quarter and anomaly functions to aggregator**

Append to `api/src/services/aggregator.ts`:

```typescript
export interface PreviousQuarterData {
  total: number;
  by_type: Record<string, number>;
}

export async function getPreviousQuarterSummary(
  db: D1Database,
  year: number,
  quarter: number
): Promise<PreviousQuarterData> {
  const prevQuarter = quarter === 1 ? 4 : quarter - 1;
  const prevYear = quarter === 1 ? year - 1 : year;

  const [totalResult, byTypeResult] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ?")
      .bind(prevYear, prevQuarter).first<{ count: number }>(),
    db.prepare("SELECT maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE year = ? AND quarter = ? GROUP BY maintenance_type")
      .bind(prevYear, prevQuarter).all<{ maintenance_type: string; count: number }>(),
  ]);

  return {
    total: totalResult?.count ?? 0,
    by_type: Object.fromEntries(byTypeResult.results.map((r) => [r.maintenance_type, r.count])),
  };
}

export interface Alert {
  type: "entity_hotspot" | "room_hotspot" | "equipment_failure" | "win10_eol";
  message: string;
  severity: "high" | "medium";
}

export async function detectAnomalies(db: D1Database, year: number, quarter: number): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Entity hotspots: entities with > 3x average count
  const entityCounts = await db.prepare(`
    SELECT oe.name, COUNT(*) as count
    FROM maintenance_logs ml JOIN org_entities oe ON ml.org_entity_id = oe.id
    WHERE ml.year = ? AND ml.quarter = ?
    GROUP BY ml.org_entity_id
  `).bind(year, quarter).all<{ name: string; count: number }>();

  if (entityCounts.results.length > 0) {
    const avg = entityCounts.results.reduce((sum, r) => sum + r.count, 0) / entityCounts.results.length;
    for (const entity of entityCounts.results) {
      if (avg > 0 && entity.count > avg * 3) {
        alerts.push({
          type: "entity_hotspot",
          message: `${entity.name} has ${entity.count} maintenance activities this quarter (${Math.round(entity.count / avg)}x average)`,
          severity: "high",
        });
      }
    }
  }

  // Room hotspots: rooms with > 5 corrective/emergency logs
  const roomCounts = await db.prepare(`
    SELECT ml.room_number, oe.name as entity_name, COUNT(*) as count
    FROM maintenance_logs ml JOIN org_entities oe ON ml.org_entity_id = oe.id
    WHERE ml.year = ? AND ml.quarter = ? AND ml.maintenance_type IN ('corrective', 'emergency') AND ml.room_number IS NOT NULL
    GROUP BY ml.room_number, ml.org_entity_id
    HAVING count > 5
  `).bind(year, quarter).all<{ room_number: string; entity_name: string; count: number }>();

  for (const room of roomCounts.results) {
    alerts.push({
      type: "room_hotspot",
      message: `Room ${room.room_number} (${room.entity_name}) has ${room.count} corrective/emergency issues`,
      severity: "medium",
    });
  }

  // Win10 EOL
  const win10Count = await db.prepare(
    "SELECT COUNT(*) as count FROM equipment WHERE os_version LIKE '%Windows 10%' AND status != 'decommissioned'"
  ).first<{ count: number }>();

  if (win10Count && win10Count.count > 0) {
    alerts.push({
      type: "win10_eol",
      message: `${win10Count.count} devices running Windows 10 (end of life — no security updates)`,
      severity: "medium",
    });
  }

  return alerts;
}

export interface EntityDetail {
  entity: { id: string; name: string; code: string; type: string };
  total: number;
  by_type: Record<string, number>;
  by_room: { room: string; count: number }[];
  by_category: { category_name: string; count: number }[];
  by_equipment: { asset_tag: string; type: string; make: string | null; model: string | null; count: number }[];
  recent_logs: RecentLog[];
}

export async function getEntityDetail(db: D1Database, entityId: string, year: number, quarter: number): Promise<EntityDetail | null> {
  const entity = await db.prepare("SELECT id, name, code, type FROM org_entities WHERE id = ?").bind(entityId).first<{ id: string; name: string; code: string; type: string }>();
  if (!entity) return null;

  const [totalResult, byTypeResult, byRoomResult, byCategoryResult, byEquipmentResult, recentResult] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM maintenance_logs WHERE org_entity_id = ? AND year = ? AND quarter = ?")
      .bind(entityId, year, quarter).first<{ count: number }>(),
    db.prepare("SELECT maintenance_type, COUNT(*) as count FROM maintenance_logs WHERE org_entity_id = ? AND year = ? AND quarter = ? GROUP BY maintenance_type")
      .bind(entityId, year, quarter).all<{ maintenance_type: string; count: number }>(),
    db.prepare("SELECT COALESCE(room_number, 'Unknown') as room, COUNT(*) as count FROM maintenance_logs WHERE org_entity_id = ? AND year = ? AND quarter = ? GROUP BY room_number ORDER BY count DESC")
      .bind(entityId, year, quarter).all<{ room: string; count: number }>(),
    db.prepare(`
      SELECT COALESCE(mc.name, 'Uncategorized') as category_name, COUNT(*) as count
      FROM maintenance_logs ml LEFT JOIN maintenance_categories mc ON ml.category_id = mc.id
      WHERE ml.org_entity_id = ? AND ml.year = ? AND ml.quarter = ?
      GROUP BY ml.category_id ORDER BY count DESC
    `).bind(entityId, year, quarter).all<{ category_name: string; count: number }>(),
    db.prepare(`
      SELECT e.asset_tag, e.type, e.make, e.model, COUNT(*) as count
      FROM maintenance_logs ml JOIN equipment e ON ml.equipment_id = e.id
      WHERE ml.org_entity_id = ? AND ml.year = ? AND ml.quarter = ?
      GROUP BY ml.equipment_id ORDER BY count DESC LIMIT 10
    `).bind(entityId, year, quarter).all<{ asset_tag: string; type: string; make: string | null; model: string | null; count: number }>(),
    db.prepare(`
      SELECT ml.id, ml.logged_date, ml.maintenance_type, ml.description, ml.status,
             oe.code as org_entity_code, t.name as technician_name
      FROM maintenance_logs ml
      JOIN org_entities oe ON ml.org_entity_id = oe.id
      JOIN technicians t ON ml.technician_id = t.id
      WHERE ml.org_entity_id = ? AND ml.year = ? AND ml.quarter = ?
      ORDER BY ml.logged_date DESC LIMIT 10
    `).bind(entityId, year, quarter).all<RecentLog>(),
  ]);

  return {
    entity,
    total: totalResult?.count ?? 0,
    by_type: Object.fromEntries(byTypeResult.results.map((r) => [r.maintenance_type, r.count])),
    by_room: byRoomResult.results,
    by_category: byCategoryResult.results,
    by_equipment: byEquipmentResult.results,
    recent_logs: recentResult.results,
  };
}
```

- [ ] **Step 2: Update dashboard route to include previous quarter + alerts**

In `api/src/routes/dashboard.ts`:
- Import `getPreviousQuarterSummary`, `detectAnomalies`, `getEntityDetail` from aggregator
- In `dashboardSummary`: call `getPreviousQuarterSummary` and `detectAnomalies` in parallel with the existing `getDashboardSummary`. Return `{ ...summary, previous, alerts }`.
- Add new handler `entityDetail(request, env, id)`:

```typescript
export async function entityDetail(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year")) || now.getFullYear();
  const quarter = Number(url.searchParams.get("quarter")) || Math.ceil((now.getMonth() + 1) / 3);

  try {
    const detail = await getEntityDetail(env.DB, id, year, quarter);
    if (!detail) return errorResponse("Entity not found", 404, request);
    return jsonResponse(detail, 200, request);
  } catch (err) {
    console.error("Entity detail error:", err);
    return errorResponse("Failed to load entity detail", 500, request);
  }
}
```

- [ ] **Step 3: Register entity detail route**

In `api/src/router.ts`, add before the 404:
```typescript
import { dashboardSummary, dashboardTrends, entityDetail } from "./routes/dashboard";

router.get("/api/dashboard/entity/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return entityDetail(request, env, id);
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add api/src/
git commit -m "feat: dashboard API — QoQ comparison, anomaly detection, entity drill-down endpoint"
```

---

## Task 2: Frontend — DeltaBadge, AlertCards, ReadinessWidget, RiskSummary

**Files:**
- Create: `web/src/components/dashboard/DeltaBadge.tsx`
- Create: `web/src/components/dashboard/AlertCards.tsx`
- Create: `web/src/components/dashboard/ReadinessWidget.tsx`
- Create: `web/src/components/dashboard/RiskSummary.tsx`

- [ ] **Step 1: Create DeltaBadge**

Create `web/src/components/dashboard/DeltaBadge.tsx`:

```tsx
interface DeltaBadgeProps {
  current: number;
  previous: number;
}

export function DeltaBadge({ current, previous }: DeltaBadgeProps) {
  if (previous === 0) {
    return current > 0 ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">New</span> : null;
  }

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-xs text-gray-400">—</span>;

  const isUp = pct > 0;
  return (
    <span className={`text-xs font-medium ${isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {isUp ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}
```

- [ ] **Step 2: Create AlertCards**

Create `web/src/components/dashboard/AlertCards.tsx`:

```tsx
import { useState, useEffect } from "react";

interface Alert {
  type: string;
  message: string;
  severity: "high" | "medium";
}

interface AlertCardsProps {
  alerts: Alert[];
}

export function AlertCards({ alerts }: AlertCardsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("rsimd_dismissed_alerts");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    sessionStorage.setItem("rsimd_dismissed_alerts", JSON.stringify([...dismissed]));
  }, [dismissed]);

  const visible = alerts.filter((a) => !dismissed.has(a.message));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <div
          key={alert.message}
          className={`flex items-start justify-between px-4 py-3 rounded-lg border ${
            alert.severity === "high"
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className={`text-sm mt-0.5 ${alert.severity === "high" ? "text-red-600" : "text-yellow-600"}`}>
              {alert.severity === "high" ? "⚠" : "ℹ"}
            </span>
            <p className={`text-sm ${alert.severity === "high" ? "text-red-800 dark:text-red-300" : "text-yellow-800 dark:text-yellow-300"}`}>
              {alert.message}
            </p>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, alert.message]))}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2 flex-shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create ReadinessWidget**

Create `web/src/components/dashboard/ReadinessWidget.tsx`:

```tsx
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "../../lib/api-client";
import { Card } from "../ui/Card";

interface ReadinessData {
  ready: number;
  can_upgrade: number;
  cannot_upgrade: number;
  unknown: number;
}

const COLORS = { ready: "#006B3F", can_upgrade: "#FCD116", cannot_upgrade: "#CE1126", unknown: "#9CA3AF" };
const LABELS = { ready: "Ready", can_upgrade: "Can Upgrade", cannot_upgrade: "Cannot Upgrade", unknown: "Unknown" };

export function ReadinessWidget() {
  const [data, setData] = useState<ReadinessData | null>(null);

  useEffect(() => {
    api.get<ReadinessData>("/equipment/readiness").then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const chartData = (["ready", "can_upgrade", "cannot_upgrade", "unknown"] as const)
    .map((key) => ({ name: LABELS[key], value: data[key], color: COLORS[key] }))
    .filter((d) => d.value > 0);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Win11 Readiness</h3>
      {total === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No equipment data</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={70} dataKey="value">
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Create RiskSummary**

Create `web/src/components/dashboard/RiskSummary.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api-client";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface AgingData {
  flagged: Array<{ health_score: number; reasons: string[] }>;
  os_distribution: Record<string, number>;
}

export function RiskSummary() {
  const navigate = useNavigate();
  const [data, setData] = useState<AgingData | null>(null);

  useEffect(() => {
    api.get<AgingData>("/equipment/aging").then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const criticalCount = data.flagged.filter((f) => f.health_score < 40).length;
  const win10Count = Object.entries(data.os_distribution)
    .filter(([os]) => os.toLowerCase().includes("windows 10"))
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Equipment Risk</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Critical health (&lt;40)</span>
          <span className="text-lg font-bold text-ghana-red">{criticalCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Windows 10 EOL</span>
          <span className="text-lg font-bold text-ghana-red">{win10Count}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Flagged total</span>
          <span className="text-lg font-bold text-yellow-600">{data.flagged.length}</span>
        </div>
      </div>
      <Button variant="secondary" size="sm" className="w-full mt-4" onClick={() => navigate("/equipment/aging")}>
        View Fleet Report
      </Button>
    </Card>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/dashboard/
git commit -m "feat: dashboard components — delta badges, anomaly alerts, readiness widget, risk summary"
```

---

## Task 3: Update Dashboard Page + SummaryCards + EntityBreakdown + Drill-Down Page

**Files:**
- Modify: `web/src/components/dashboard/SummaryCards.tsx`
- Modify: `web/src/components/dashboard/EntityBreakdown.tsx`
- Modify: `web/src/pages/DashboardPage.tsx`
- Create: `web/src/pages/EntityDetailPage.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Update SummaryCards to accept and show deltas**

Read `web/src/components/dashboard/SummaryCards.tsx`. Update:
- Add `previous?: { total: number; by_type: Record<string, number> }` to props
- Import `DeltaBadge`
- Show DeltaBadge under each count:

```tsx
import { DeltaBadge } from "./DeltaBadge";

interface SummaryCardsProps {
  total: number;
  byType: Record<string, number>;
  previous?: { total: number; by_type: Record<string, number> };
}

// In Total card, add after the count:
{previous && <DeltaBadge current={total} previous={previous.total} />}

// In each type card, add after the count:
{previous && <DeltaBadge current={byType[key] ?? 0} previous={previous.by_type[key] ?? 0} />}
```

- [ ] **Step 2: Update EntityBreakdown to support click drill-down**

Read `web/src/components/dashboard/EntityBreakdown.tsx`. Add:
- Accept optional `onEntityClick?: (entityId: string) => void` prop
- Add `entity_id` to the data items (already in API response)
- Add `onClick` handler to the Bar:

```tsx
interface EntityBreakdownProps {
  data: { entity_id: string; entity_code: string; entity_name: string; count: number }[];
  onEntityClick?: (entityId: string) => void;
}

// On the Bar component, add:
<Bar
  dataKey="count"
  fill="#006B3F"
  radius={[0, 4, 4, 0]}
  cursor={onEntityClick ? "pointer" : undefined}
  onClick={(data) => {
    if (onEntityClick && data?.entity_id) onEntityClick(data.entity_id as string);
  }}
/>
```

- [ ] **Step 3: Update DashboardPage**

Read `web/src/pages/DashboardPage.tsx`. Updates:
- Update `DashboardSummary` interface to add `previous`, `alerts`
- Import AlertCards, ReadinessWidget, RiskSummary
- Import `useNavigate`
- Pass `previous` to SummaryCards
- Pass `onEntityClick` to EntityBreakdown → `navigate(\`/dashboard/entity/\${id}?year=\${year}&quarter=\${quarter}\`)`
- Add AlertCards before SummaryCards
- Replace bottom 3-col grid: CategoryRanking, RecentActivity, then a div with ReadinessWidget + RiskSummary stacked (or EquipmentHealth + ReadinessWidget + RiskSummary in 4 cols if space)

Updated interface:
```typescript
interface DashboardSummary {
  // ... existing fields ...
  previous?: { total: number; by_type: Record<string, number> };
  alerts?: { type: string; message: string; severity: "high" | "medium" }[];
}
```

Layout:
```tsx
{data.alerts && data.alerts.length > 0 && <AlertCards alerts={data.alerts} />}
<SummaryCards total={data.total} byType={data.by_type} previous={data.previous} />
// ... existing charts ...
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <CategoryRanking data={data.top_categories} />
  <RecentActivity data={data.recent_logs} />
  <ReadinessWidget />
  <RiskSummary />
</div>
```

- [ ] **Step 4: Create EntityDetailPage**

Create `web/src/pages/EntityDetailPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { CategoryRanking } from "../components/dashboard/CategoryRanking";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { Table } from "../components/ui/Table";

interface EntityDetailData {
  entity: { id: string; name: string; code: string; type: string };
  total: number;
  by_type: Record<string, number>;
  by_room: { room: string; count: number }[];
  by_category: { category_name: string; count: number }[];
  by_equipment: { asset_tag: string; type: string; make: string | null; model: string | null; count: number }[];
  recent_logs: Array<{
    id: string; logged_date: string; maintenance_type: string;
    description: string; status: string; org_entity_code: string; technician_name: string;
  }>;
}

export function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<EntityDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const quarter = searchParams.get("quarter") ?? String(Math.ceil((new Date().getMonth() + 1) / 3));

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.get<EntityDetailData>(`/dashboard/entity/${id}?year=${year}&quarter=${quarter}`)
      .then(setData)
      .catch(() => { showToast("error", "Failed to load entity detail"); navigate("/"); })
      .finally(() => setIsLoading(false));
  }, [id, year, quarter, showToast, navigate]);

  if (isLoading || !data) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" /></div>;
  }

  const equipColumns = [
    { key: "asset_tag", header: "Asset Tag" },
    { key: "type", header: "Type" },
    { key: "make", header: "Make/Model", render: (r: Record<string, unknown>) => `${r.make ?? ""} ${r.model ?? ""}`.trim() || "—" },
    { key: "count", header: "Logs" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate("/")}>&larr; Dashboard</Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.entity.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Q{quarter} {year} — {data.entity.code}</p>
        </div>
      </div>

      <SummaryCards total={data.total} byType={data.by_type} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">By Room</h3>
          <ResponsiveContainer width="100%" height={Math.max(150, data.by_room.length * 35)}>
            <BarChart data={data.by_room} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="room" width={60} />
              <Tooltip />
              <Bar dataKey="count" fill="#006B3F" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <CategoryRanking data={data.by_category} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Equipment</h3>
          <Table columns={equipColumns} data={data.by_equipment as unknown as Record<string, unknown>[]} keyField="asset_tag" onRowClick={(r) => navigate(`/equipment/${r.asset_tag}`)} emptyMessage="No equipment logs" />
        </Card>
        <RecentActivity data={data.recent_logs} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add route to App.tsx**

Import `EntityDetailPage` and add route inside ProtectedRoutes:
```tsx
<Route path="dashboard/entity/:id" element={<EntityDetailPage />} />
```

- [ ] **Step 6: Verify TypeScript compiles and builds**

```bash
cd web && npx tsc --noEmit && npx vite build
```

- [ ] **Step 7: Commit**

```bash
git add web/src/
git commit -m "feat: dashboard — QoQ deltas, anomaly alerts, entity drill-down, readiness widget, risk summary"
```

---

## Verification Checklist

- [ ] `cd api && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx tsc --noEmit` — zero errors
- [ ] Dashboard summary API includes `previous` and `alerts` fields
- [ ] Summary cards show delta percentages comparing to previous quarter
- [ ] Alert cards appear for anomalies (dismissible, persist in sessionStorage)
- [ ] Win11 Readiness widget shows pie chart
- [ ] Risk Summary card shows critical/EOL/flagged counts with link to fleet report
- [ ] Clicking entity bar navigates to drill-down page
- [ ] Entity detail page shows room breakdown, category ranking, top equipment, recent logs
- [ ] Entity detail respects year/quarter from URL params
