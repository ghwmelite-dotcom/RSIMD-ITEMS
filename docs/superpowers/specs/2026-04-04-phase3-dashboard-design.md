# Phase 3: Dashboard Enhancements — Design Specification

**Date:** 2026-04-04
**Status:** Approved

---

## 1. Quarter-over-Quarter Deltas

### API Change
`GET /api/dashboard/summary` response gains `previous` field containing the previous quarter's `total` and `by_type` counts. The API queries the previous quarter automatically (Q2→Q1, Q1→Q4 of previous year).

### Frontend
Each summary card shows a delta badge:
- Green up arrow + `+N%` if current > previous
- Red down arrow + `-N%` if current < previous
- Gray `—` if no previous data
- Percentage calculated as `((current - previous) / previous * 100)`

---

## 2. Drill-Down: Entity Detail Page

### API
New endpoint: `GET /api/dashboard/entity/:id?year=&quarter=`

Returns:
- `entity`: name, code, type
- `total`: count for this entity
- `by_type`: breakdown by maintenance type
- `by_room`: `{room, count}[]`
- `by_category`: `{category_name, count}[]`
- `by_equipment`: `{asset_tag, type, make, model, count}[]`
- `recent_logs`: last 10 logs for this entity

### Frontend
New page: `/dashboard/entity/:id` with:
- Entity name heading + back button
- Summary cards (total + by type)
- Room breakdown horizontal bar chart
- Category ranking list
- Equipment table (which devices needed the most work)
- Recent activity feed

Accessible by clicking a bar in the EntityBreakdown chart on the main dashboard.

---

## 3. Anomaly Alerts

### API
Computed in the dashboard summary response. New field `alerts: {type, message, severity}[]`.

Detection rules:
- **Entity hotspot**: entity with count > 3x the average entity count → "high" severity
- **Room hotspot**: room with >5 corrective/emergency logs → "medium" severity  
- **Equipment failure**: equipment with >5 corrective/emergency logs → "high" severity
- **Win10 EOL risk**: count of Win10 devices > 0 → "medium" severity (static alert from equipment table)

### Frontend
Alert cards at the top of the dashboard, before summary cards:
- Red border for "high" severity, yellow for "medium"
- Dismissible (X button, stored in sessionStorage so they reappear next session)

---

## 4. Win11 Readiness Widget

### Frontend
New dashboard component fetching `/api/equipment/readiness`.
- Small pie chart: green (Ready), gold (Can Upgrade), red (Cannot Upgrade), gray (Unknown)
- Total count and percentage labels
- Replaces EquipmentHealth in the bottom row, or sits as a 4th card alongside it

---

## 5. Equipment Risk Summary Card

### Frontend
Card showing:
- Count of equipment with health_score < 40 (from aging endpoint)
- Count with Windows 10 EOL
- "View Report" link to `/equipment/aging`

---

## File Structure

### API New/Modified Files
| File | Change |
|------|--------|
| `api/src/services/aggregator.ts` | Add `getPreviousQuarterSummary`, `getEntityDetail`, `detectAnomalies` |
| `api/src/routes/dashboard.ts` | Add previous quarter data + alerts to summary, add entity detail endpoint |
| `api/src/router.ts` | Add entity detail route |

### Frontend New Files
| File | Responsibility |
|------|---------------|
| `web/src/components/dashboard/DeltaBadge.tsx` | QoQ percentage change indicator |
| `web/src/components/dashboard/AlertCards.tsx` | Anomaly alert dismissible cards |
| `web/src/components/dashboard/ReadinessWidget.tsx` | Win11 readiness pie chart |
| `web/src/components/dashboard/RiskSummary.tsx` | Equipment risk count card |
| `web/src/pages/EntityDetailPage.tsx` | Drill-down page for single entity |

### Frontend Modified Files
| File | Change |
|------|--------|
| `web/src/components/dashboard/SummaryCards.tsx` | Add delta badges |
| `web/src/components/dashboard/EntityBreakdown.tsx` | Click handler for drill-down |
| `web/src/pages/DashboardPage.tsx` | Add alerts, readiness widget, risk summary, updated layout |
| `web/src/App.tsx` | Add entity detail route |
