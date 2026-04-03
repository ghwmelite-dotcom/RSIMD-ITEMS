# Phase 2: Equipment Registry Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add equipment health scoring, Windows 11 readiness assessment, aging fleet report, equipment timeline, and bulk QR printing — building the data-driven evidence for equipment replacement decisions.

**Architecture:** Health score and readiness are computed server-side via a shared service. Two new API endpoints for readiness and aging analytics. Frontend gets new components for timeline, health gauge, readiness badge, and bulk QR. Aging report is a new page.

**Tech Stack:** Cloudflare Workers D1 (analytics queries), React 18 + Tailwind + Recharts (visualization), qrcode npm (bulk QR)

---

## Task 1: Health Score Service + API Integration

**Files:**
- Create: `api/src/services/health-score.ts`
- Modify: `api/src/routes/equipment.ts`
- Modify: `api/src/db/queries.ts`

- [ ] **Step 1: Create health score service**

Create `api/src/services/health-score.ts`:

```typescript
import type { EquipmentRow } from "../types";

export interface EquipmentWithScore extends EquipmentRow {
  health_score: number;
  win11_readiness: "ready" | "can_upgrade" | "cannot_upgrade" | "unknown" | "n/a";
}

export function calculateHealthScore(
  equipment: EquipmentRow,
  correctiveEmergencyCount: number,
  lastLogDate: string | null
): number {
  let score = 100;

  // Age penalty: -5 per year (max -40)
  if (equipment.installed_date) {
    const years = (Date.now() - new Date(equipment.installed_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    score -= Math.min(40, Math.floor(years) * 5);
  } else {
    score -= 10;
  }

  // Failure penalty: -3 per corrective/emergency log (max -30)
  score -= Math.min(30, correctiveEmergencyCount * 3);

  // Staleness penalty: -10 if no maintenance in 180 days
  if (lastLogDate) {
    const daysSince = (Date.now() - new Date(lastLogDate).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > 180) score -= 10;
  } else {
    score -= 10;
  }

  // OS EOL penalty: -20 for Windows 10
  if (equipment.os_version?.toLowerCase().includes("windows 10")) {
    score -= 20;
  }

  // Hardware penalty: -10 for legacy processors
  const legacyProcessors = ["pentium", "celeron", "core 2 duo"];
  if (equipment.processor_gen && legacyProcessors.some((p) => equipment.processor_gen!.toLowerCase().includes(p))) {
    score -= 10;
  }

  return Math.max(0, score);
}

const CANNOT_UPGRADE_PROCESSORS = ["pentium", "celeron", "core 2 duo", "4th gen", "5th gen", "6th gen", "7th gen"];

export function getWin11Readiness(
  osVersion: string | null,
  processorGen: string | null
): "ready" | "can_upgrade" | "cannot_upgrade" | "unknown" | "n/a" {
  if (!osVersion) return "unknown";

  const os = osVersion.toLowerCase();
  if (os.includes("windows 11")) return "ready";
  if (!os.includes("windows 10")) return "n/a";

  // Windows 10 — check processor
  if (!processorGen) return "unknown";
  const proc = processorGen.toLowerCase();

  if (CANNOT_UPGRADE_PROCESSORS.some((p) => proc.includes(p))) {
    return "cannot_upgrade";
  }

  return "can_upgrade";
}
```

- [ ] **Step 2: Add log count query to queries.ts**

Append to `api/src/db/queries.ts`:

```typescript
export async function getEquipmentLogStats(
  db: D1Database,
  equipmentId: string
): Promise<{ corrective_emergency_count: number; last_log_date: string | null }> {
  const [countResult, lastResult] = await Promise.all([
    db.prepare(
      "SELECT COUNT(*) as count FROM maintenance_logs WHERE equipment_id = ? AND maintenance_type IN ('corrective', 'emergency')"
    ).bind(equipmentId).first<{ count: number }>(),
    db.prepare(
      "SELECT MAX(logged_date) as last_date FROM maintenance_logs WHERE equipment_id = ?"
    ).bind(equipmentId).first<{ last_date: string | null }>(),
  ]);

  return {
    corrective_emergency_count: countResult?.count ?? 0,
    last_log_date: lastResult?.last_date ?? null,
  };
}

export async function getAllEquipmentLogStats(
  db: D1Database
): Promise<Map<string, { corrective_emergency_count: number; last_log_date: string | null }>> {
  const [counts, lastDates] = await Promise.all([
    db.prepare(
      "SELECT equipment_id, COUNT(*) as count FROM maintenance_logs WHERE maintenance_type IN ('corrective', 'emergency') AND equipment_id IS NOT NULL GROUP BY equipment_id"
    ).all<{ equipment_id: string; count: number }>(),
    db.prepare(
      "SELECT equipment_id, MAX(logged_date) as last_date FROM maintenance_logs WHERE equipment_id IS NOT NULL GROUP BY equipment_id"
    ).all<{ equipment_id: string; last_date: string }>(),
  ]);

  const map = new Map<string, { corrective_emergency_count: number; last_log_date: string | null }>();
  for (const row of counts.results) {
    map.set(row.equipment_id, { corrective_emergency_count: row.count, last_log_date: null });
  }
  for (const row of lastDates.results) {
    const existing = map.get(row.equipment_id);
    if (existing) {
      existing.last_log_date = row.last_date;
    } else {
      map.set(row.equipment_id, { corrective_emergency_count: 0, last_log_date: row.last_date });
    }
  }
  return map;
}
```

- [ ] **Step 3: Update equipment list handler to include health scores**

In `api/src/routes/equipment.ts`, update `listEquipmentHandler`:
- Import `calculateHealthScore`, `getWin11Readiness` from `../services/health-score`
- Import `getAllEquipmentLogStats` from `../db/queries`
- After fetching equipment list, call `getAllEquipmentLogStats(env.DB)`
- Map each equipment item to include `health_score` and `win11_readiness`

```typescript
// In listEquipmentHandler, after getting equipment:
const logStats = await getAllEquipmentLogStats(env.DB);

const enriched = equipment.map((eq) => {
  const stats = logStats.get(eq.id) ?? { corrective_emergency_count: 0, last_log_date: null };
  return {
    ...eq,
    health_score: calculateHealthScore(eq, stats.corrective_emergency_count, stats.last_log_date),
    win11_readiness: getWin11Readiness(eq.os_version, eq.processor_gen),
  };
});

return jsonResponse(enriched, 200, request);
```

- [ ] **Step 4: Update equipment detail handler to include health score**

In `getEquipmentHandler`, after fetching equipment and history:
- Import `getEquipmentLogStats` from `../db/queries`
- Call `getEquipmentLogStats(env.DB, id)`
- Add `health_score` and `win11_readiness` to the equipment object

```typescript
const stats = await getEquipmentLogStats(env.DB, id);
const health_score = calculateHealthScore(equipment, stats.corrective_emergency_count, stats.last_log_date);
const win11_readiness = getWin11Readiness(equipment.os_version, equipment.processor_gen);

return jsonResponse({
  equipment: { ...equipment, health_score, win11_readiness },
  maintenance_history,
}, 200, request);
```

Do the same for `getEquipmentByTagHandler`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add api/src/
git commit -m "feat: equipment health score algorithm and Win11 readiness assessment"
```

---

## Task 2: Equipment Analytics API (Readiness + Aging)

**Files:**
- Create: `api/src/routes/equipment-analytics.ts`
- Modify: `api/src/router.ts`

- [ ] **Step 1: Create equipment analytics route handler**

Create `api/src/routes/equipment-analytics.ts`:

```typescript
import type { Env } from "../types";
import { jsonResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { listEquipment, getAllEquipmentLogStats } from "../db/queries";
import { calculateHealthScore, getWin11Readiness } from "../services/health-score";

export async function readinessReport(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const equipment = await listEquipment(env.DB, {});
  const logStats = await getAllEquipmentLogStats(env.DB);

  let ready = 0, canUpgrade = 0, cannotUpgrade = 0, unknown = 0, na = 0;
  const details: Array<{ id: string; asset_tag: string; type: string; make: string | null; model: string | null; os_version: string | null; processor_gen: string | null; readiness: string }> = [];

  for (const eq of equipment) {
    const readiness = getWin11Readiness(eq.os_version, eq.processor_gen);
    switch (readiness) {
      case "ready": ready++; break;
      case "can_upgrade": canUpgrade++; break;
      case "cannot_upgrade": cannotUpgrade++; break;
      case "unknown": unknown++; break;
      case "n/a": na++; break;
    }
    if (readiness === "cannot_upgrade" || readiness === "can_upgrade") {
      details.push({ id: eq.id, asset_tag: eq.asset_tag, type: eq.type, make: eq.make, model: eq.model, os_version: eq.os_version, processor_gen: eq.processor_gen, readiness });
    }
  }

  return jsonResponse({ ready, can_upgrade: canUpgrade, cannot_upgrade: cannotUpgrade, unknown, na, details }, 200, request);
}

export async function agingReport(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const equipment = await listEquipment(env.DB, {});
  const logStats = await getAllEquipmentLogStats(env.DB);

  const now = Date.now();
  const ageBrackets = { "0-2yr": 0, "2-5yr": 0, "5-8yr": 0, "8+yr": 0, "unknown": 0 };
  const osDistribution: Record<string, number> = {};
  const flagged: Array<{
    id: string; asset_tag: string; type: string; make: string | null; model: string | null;
    os_version: string | null; processor_gen: string | null; health_score: number;
    reasons: string[];
  }> = [];

  for (const eq of equipment) {
    // Age distribution
    if (eq.installed_date) {
      const years = (now - new Date(eq.installed_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (years < 2) ageBrackets["0-2yr"]++;
      else if (years < 5) ageBrackets["2-5yr"]++;
      else if (years < 8) ageBrackets["5-8yr"]++;
      else ageBrackets["8+yr"]++;
    } else {
      ageBrackets["unknown"]++;
    }

    // OS distribution
    const os = eq.os_version ?? "Not set";
    osDistribution[os] = (osDistribution[os] ?? 0) + 1;

    // Health score
    const stats = logStats.get(eq.id) ?? { corrective_emergency_count: 0, last_log_date: null };
    const healthScore = calculateHealthScore(eq, stats.corrective_emergency_count, stats.last_log_date);
    const readiness = getWin11Readiness(eq.os_version, eq.processor_gen);

    // Flag if health < 40 or cannot upgrade
    const reasons: string[] = [];
    if (healthScore < 40) reasons.push("Low health score");
    if (readiness === "cannot_upgrade") reasons.push("Cannot upgrade to Windows 11");
    if (eq.os_version?.toLowerCase().includes("windows 10")) reasons.push("Windows 10 EOL");
    const legacyProc = ["pentium", "celeron", "core 2 duo"];
    if (eq.processor_gen && legacyProc.some((p) => eq.processor_gen!.toLowerCase().includes(p))) {
      reasons.push("Legacy processor");
    }

    if (reasons.length > 0) {
      flagged.push({
        id: eq.id, asset_tag: eq.asset_tag, type: eq.type, make: eq.make, model: eq.model,
        os_version: eq.os_version, processor_gen: eq.processor_gen, health_score: healthScore, reasons,
      });
    }
  }

  // Sort flagged by health score ascending (worst first)
  flagged.sort((a, b) => a.health_score - b.health_score);

  return jsonResponse({
    total_equipment: equipment.length,
    age_distribution: ageBrackets,
    os_distribution: osDistribution,
    flagged,
  }, 200, request);
}
```

- [ ] **Step 2: Register routes in router.ts**

Add before the 404 catch-all:

```typescript
import { readinessReport, agingReport } from "./routes/equipment-analytics";

// Equipment Analytics (before /equipment/:id to avoid param capture)
router.get("/api/equipment/readiness", (request: Request, env: Env) => readinessReport(request, env));
router.get("/api/equipment/aging", (request: Request, env: Env) => agingReport(request, env));
```

**Important:** These must be registered BEFORE the `/api/equipment/:id` route.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/
git commit -m "feat: equipment analytics API — Win11 readiness and aging fleet report endpoints"
```

---

## Task 3: Frontend — Health Score, Readiness Badge, Timeline Components

**Files:**
- Create: `web/src/components/equipment/HealthScoreBar.tsx`
- Create: `web/src/components/equipment/ReadinessBadge.tsx`
- Create: `web/src/components/equipment/EquipmentTimeline.tsx`
- Modify: `web/src/types.ts`

- [ ] **Step 1: Update frontend Equipment type**

In `web/src/types.ts`, add to the `Equipment` interface:

```typescript
  health_score?: number;
  win11_readiness?: "ready" | "can_upgrade" | "cannot_upgrade" | "unknown" | "n/a";
```

- [ ] **Step 2: Create HealthScoreBar component**

Create `web/src/components/equipment/HealthScoreBar.tsx`:

```tsx
interface HealthScoreBarProps {
  score: number;
  showLabel?: boolean;
}

function getColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

function getTextColor(score: number): string {
  if (score >= 70) return "text-green-700 dark:text-green-400";
  if (score >= 40) return "text-yellow-700 dark:text-yellow-400";
  return "text-red-700 dark:text-red-400";
}

export function HealthScoreBar({ score, showLabel = true }: HealthScoreBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-semibold min-w-[2rem] text-right ${getTextColor(score)}`}>
          {score}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ReadinessBadge component**

Create `web/src/components/equipment/ReadinessBadge.tsx`:

```tsx
import { Badge } from "../ui/Badge";

interface ReadinessBadgeProps {
  readiness: "ready" | "can_upgrade" | "cannot_upgrade" | "unknown" | "n/a";
}

const CONFIG: Record<string, { label: string; variant: "green" | "gold" | "red" | "gray" }> = {
  ready: { label: "Win11 Ready", variant: "green" },
  can_upgrade: { label: "Can Upgrade", variant: "gold" },
  cannot_upgrade: { label: "Cannot Upgrade", variant: "red" },
  unknown: { label: "OS Unknown", variant: "gray" },
  "n/a": { label: "N/A", variant: "gray" },
};

export function ReadinessBadge({ readiness }: ReadinessBadgeProps) {
  const config = CONFIG[readiness] ?? CONFIG["unknown"]!;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

- [ ] **Step 4: Create EquipmentTimeline component**

Create `web/src/components/equipment/EquipmentTimeline.tsx`:

```tsx
import { Badge } from "../ui/Badge";
import { StatusPill } from "../ui/StatusPill";
import type { MaintenanceLog } from "../../types";

const TYPE_COLORS: Record<string, "green" | "gold" | "red" | "gray"> = {
  routine: "green",
  corrective: "gold",
  emergency: "red",
  condition_based: "gray",
  predictive: "gray",
};

const TYPE_LABELS: Record<string, string> = {
  routine: "Routine",
  corrective: "Corrective",
  emergency: "Emergency",
  condition_based: "Condition-Based",
  predictive: "Predictive",
};

interface EquipmentTimelineProps {
  history: MaintenanceLog[];
  registeredDate: string;
}

export function EquipmentTimeline({ history, registeredDate }: EquipmentTimelineProps) {
  const events = [
    ...history.map((log) => ({
      date: log.logged_date,
      type: log.maintenance_type,
      description: log.description,
      status: log.status,
      isRegistration: false,
    })),
    {
      date: registeredDate.slice(0, 10),
      type: "registered",
      description: "Equipment registered",
      status: "completed" as const,
      isRegistration: true,
    },
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-6">
        {events.map((event, i) => (
          <div key={i} className="relative flex gap-4 pl-10">
            <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
              event.isRegistration ? "bg-ghana-green" : (TYPE_COLORS[event.type] === "red" ? "bg-red-500" : TYPE_COLORS[event.type] === "gold" ? "bg-yellow-500" : "bg-green-500")
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{event.date}</span>
                {!event.isRegistration && (
                  <Badge variant={TYPE_COLORS[event.type] ?? "gray"}>
                    {TYPE_LABELS[event.type] ?? event.type}
                  </Badge>
                )}
                {event.isRegistration && <Badge variant="green">Registered</Badge>}
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {event.description.length > 100 ? event.description.slice(0, 100) + "..." : event.description}
              </p>
              {!event.isRegistration && <StatusPill status={event.status} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add web/src/
git commit -m "feat: equipment UI components — health score bar, readiness badge, timeline"
```

---

## Task 4: Update Equipment Detail Page

**Files:**
- Modify: `web/src/components/equipment/EquipmentDetail.tsx`
- Modify: `web/src/pages/EquipmentDetailPage.tsx`

- [ ] **Step 1: Update EquipmentDetail to show health score, readiness, OS, processor**

Read `web/src/components/equipment/EquipmentDetail.tsx`. Add:
- Import `HealthScoreBar` and `ReadinessBadge`
- Add `os_version` and `processor_gen` to the fields list
- Add a health score row using `HealthScoreBar`
- Add readiness badge next to OS version
- If OS contains "Windows 10", show a red "EOL" Badge next to it

Add these fields to the `fields` array:
```tsx
{ label: "Operating System", value: (
  <div className="flex items-center gap-2">
    <span>{equipment.os_version ?? "—"}</span>
    {equipment.os_version?.toLowerCase().includes("windows 10") && <Badge variant="red">EOL</Badge>}
  </div>
)},
{ label: "Processor Gen", value: equipment.processor_gen ?? "—" },
{ label: "Win11 Readiness", value: equipment.win11_readiness ? <ReadinessBadge readiness={equipment.win11_readiness} /> : "—" },
{ label: "Health Score", value: equipment.health_score !== undefined ? <HealthScoreBar score={equipment.health_score} /> : "—" },
```

- [ ] **Step 2: Update EquipmentDetailPage — replace history table with timeline**

Read `web/src/pages/EquipmentDetailPage.tsx`. Replace the maintenance history `<Card>` section with:
- Import `EquipmentTimeline`
- Replace the Table with `<EquipmentTimeline history={history} registeredDate={equipment.created_at ?? equipment.installed_date ?? ""} />`

The Card heading stays "Maintenance History", but the content changes from Table to EquipmentTimeline.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/src/
git commit -m "feat: enhanced equipment detail — health score, readiness badge, OS EOL warning, timeline"
```

---

## Task 5: Update Equipment List + Bulk QR Print

**Files:**
- Create: `web/src/components/equipment/BulkQRPrint.tsx`
- Modify: `web/src/components/equipment/EquipmentList.tsx`

- [ ] **Step 1: Create BulkQRPrint component**

Create `web/src/components/equipment/BulkQRPrint.tsx`:

```tsx
import { useCallback } from "react";
import QRCode from "qrcode";
import type { Equipment } from "../../types";

interface BulkQRPrintProps {
  equipment: Equipment[];
}

export function BulkQRPrint({ equipment }: BulkQRPrintProps) {
  const handlePrint = useCallback(async () => {
    const qrDataUrls: string[] = [];
    for (const eq of equipment) {
      const url = `${window.location.origin}/scan/${eq.asset_tag}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 150, margin: 1 });
      qrDataUrls.push(dataUrl);
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cells = equipment.map((eq, i) => `
      <div style="width:33.33%;padding:8px;box-sizing:border-box;text-align:center;page-break-inside:avoid;">
        <img src="${qrDataUrls[i]}" style="width:120px;height:120px;" />
        <div style="font-size:11px;font-weight:bold;margin-top:4px;">${eq.asset_tag}</div>
        <div style="font-size:9px;color:#666;">Room ${eq.room_number ?? "—"}</div>
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR Labels — RSIMD-ITEMS</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .grid { display: flex; flex-wrap: wrap; }
      </style></head>
      <body>
        <h3 style="text-align:center;margin:8px 0;">OHCS Equipment QR Labels</h3>
        <div class="grid">${cells}</div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    printWindow.document.close();
  }, [equipment]);

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print QR Labels ({equipment.length})
    </button>
  );
}
```

- [ ] **Step 2: Update EquipmentList — add health score column, checkboxes, bulk QR**

Read `web/src/components/equipment/EquipmentList.tsx`. Make these changes:

1. Import `HealthScoreBar` and `BulkQRPrint`
2. Add `const [selected, setSelected] = useState<Set<string>>(new Set());`
3. Add a checkbox column as the first column:
```tsx
{
  key: "select",
  header: "",
  render: (e: Equipment) => (
    <input
      type="checkbox"
      checked={selected.has(e.id)}
      onChange={(ev) => {
        ev.stopPropagation();
        setSelected((prev) => {
          const next = new Set(prev);
          next.has(e.id) ? next.delete(e.id) : next.add(e.id);
          return next;
        });
      }}
      className="h-4 w-4 rounded border-gray-300"
    />
  ),
}
```

4. Add a health score column:
```tsx
{
  key: "health_score",
  header: "Health",
  render: (e: Equipment) => e.health_score !== undefined ? <HealthScoreBar score={e.health_score} /> : "—",
}
```

5. Show BulkQRPrint button when items are selected:
```tsx
{selected.size > 0 && (
  <BulkQRPrint equipment={equipment.filter((e) => selected.has(e.id))} />
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/src/
git commit -m "feat: equipment list — health score column, checkboxes, bulk QR label printing"
```

---

## Task 6: Aging Fleet Report Page

**Files:**
- Create: `web/src/pages/AgingReportPage.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/pages/EquipmentPage.tsx`

- [ ] **Step 1: Create AgingReportPage**

Create `web/src/pages/AgingReportPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { HealthScoreBar } from "../components/equipment/HealthScoreBar";
import { exportToCsv } from "../lib/export-csv";

interface AgingData {
  total_equipment: number;
  age_distribution: Record<string, number>;
  os_distribution: Record<string, number>;
  flagged: Array<{
    id: string; asset_tag: string; type: string; make: string | null; model: string | null;
    os_version: string | null; processor_gen: string | null; health_score: number;
    reasons: string[];
  }>;
}

const OS_COLORS: Record<string, string> = {
  "Windows 10 Pro": "#CE1126",
  "Windows 10 Home": "#CE1126",
  "Windows 11 Pro": "#006B3F",
  "Windows 11 Home": "#006B3F",
  "Not set": "#9CA3AF",
};

export function AgingReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<AgingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<AgingData>("/equipment/aging")
      .then(setData)
      .catch(() => showToast("error", "Failed to load aging report"))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const ageData = Object.entries(data.age_distribution).map(([bracket, count]) => ({ name: bracket, count }));
  const osData = Object.entries(data.os_distribution).map(([os, count]) => ({
    name: os, value: count, color: OS_COLORS[os] ?? "#6B7280",
  }));

  const flaggedColumns = [
    { key: "asset_tag", header: "Asset Tag" },
    { key: "type", header: "Type" },
    { key: "make", header: "Make", render: (r: Record<string, unknown>) => `${r.make ?? ""} ${r.model ?? ""}`.trim() || "—" },
    { key: "os_version", header: "OS", render: (r: Record<string, unknown>) => String(r.os_version ?? "Not set") },
    { key: "processor_gen", header: "Processor", render: (r: Record<string, unknown>) => String(r.processor_gen ?? "—") },
    { key: "health_score", header: "Health", render: (r: Record<string, unknown>) => <HealthScoreBar score={Number(r.health_score)} /> },
    { key: "reasons", header: "Issues", render: (r: Record<string, unknown>) => (
      <div className="flex flex-wrap gap-1">
        {(r.reasons as string[]).map((reason, i) => (
          <Badge key={i} variant={reason.includes("EOL") || reason.includes("Cannot") ? "red" : "gold"}>{reason}</Badge>
        ))}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate("/equipment")}>&larr; Back</Button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Aging Fleet Report</h2>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{data.total_equipment} total equipment</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Age Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageData} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={50} />
              <Tooltip />
              <Bar dataKey="count" fill="#006B3F" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">OS Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={osData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {osData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Needs Replacement ({data.flagged.length})
          </h3>
          {data.flagged.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportToCsv("flagged-equipment", [
                { key: "asset_tag", header: "Asset Tag" },
                { key: "type", header: "Type" },
                { key: "make", header: "Make" },
                { key: "model", header: "Model" },
                { key: "os_version", header: "OS" },
                { key: "processor_gen", header: "Processor" },
                { key: "health_score", header: "Health Score" },
                { key: "reasons", header: "Issues" },
              ], data.flagged.map((f) => ({ ...f, reasons: f.reasons.join("; ") })) as unknown as Record<string, unknown>[])}
            >
              Export CSV
            </Button>
          )}
        </div>
        <Table
          columns={flaggedColumns}
          data={data.flagged as unknown as Record<string, unknown>[]}
          keyField="id"
          onRowClick={(r) => navigate(`/equipment/${r.id as string}`)}
          emptyMessage="No equipment flagged for replacement"
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add aging report route to App.tsx**

In `web/src/App.tsx`, import `AgingReportPage` and add:
```tsx
<Route path="equipment/aging" element={<AgingReportPage />} />
```
Place it BEFORE `equipment/:id` route.

- [ ] **Step 3: Add link to aging report on EquipmentPage**

In `web/src/pages/EquipmentPage.tsx`, add a "Fleet Report" button next to "Register Equipment":
```tsx
<Button variant="secondary" onClick={() => navigate("/equipment/aging")}>Fleet Report</Button>
```
Import `useNavigate` and call `const navigate = useNavigate();`

- [ ] **Step 4: Verify TypeScript compiles and builds**

```bash
cd web && npx tsc --noEmit && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add web/src/
git commit -m "feat: aging fleet report — age distribution, OS breakdown, flagged equipment with CSV export"
```

---

## Verification Checklist

- [ ] `cd api && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx vite build` — success
- [ ] Equipment list shows health score column with colored bars
- [ ] Equipment list has checkboxes + "Print QR Labels" button
- [ ] Bulk QR opens a printable A4 page with selected equipment QR codes
- [ ] Equipment detail shows OS version with EOL badge, processor gen, readiness badge, health score bar
- [ ] Equipment detail shows timeline instead of flat table
- [ ] `/api/equipment/readiness` returns readiness counts
- [ ] `/api/equipment/aging` returns age distribution + flagged items
- [ ] Aging report page shows charts + flagged equipment table with CSV export
- [ ] Equipment page has "Fleet Report" link to aging report
