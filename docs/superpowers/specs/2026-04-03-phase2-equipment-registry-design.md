# Phase 2: Equipment Registry Enhancements — Design Specification

**Date:** 2026-04-03
**Status:** Approved

---

## 1. Equipment Health Score

Computed 0-100 score per device. Calculated server-side on equipment fetch.

### Algorithm
- **Base:** 100 points
- **Age penalty:** -5 per year since `installed_date` (max -40). No installed_date = -10.
- **Failure penalty:** -3 per corrective/emergency maintenance log (max -30)
- **Staleness penalty:** -10 if no maintenance in last 180 days (healthy equipment gets checked)
- **OS EOL penalty:** -20 if `os_version` contains "Windows 10"
- **Hardware penalty:** -10 if `processor_gen` is Pentium, Celeron, or Core 2 Duo
- **Floor:** minimum 0

### API Changes
- `GET /api/equipment/:id` response: add `health_score: number` to the equipment object
- `GET /api/equipment` list response: add `health_score: number` to each item
- New helper: `calculateHealthScore(equipment, logCount, lastLogDate)` in `api/src/services/health-score.ts`

### Frontend
- Equipment detail: colored progress bar (green >= 70, gold >= 40, red < 40)
- Equipment list: health score column with colored dot indicator

---

## 2. Windows 11 Readiness Assessment

### Readiness Logic
| OS | Processor Gen | Status | Color |
|----|--------------|--------|-------|
| Windows 11 * | any | Ready | green |
| Windows 10 * | 8th Gen+, Ryzen | Can Upgrade | gold |
| Windows 10 * | Pentium, Celeron, Core 2 Duo, 4th-7th Gen | Cannot Upgrade | red |
| No OS set | any | Unknown | gray |
| Other OS | any | N/A | gray |

### API
- New endpoint: `GET /api/equipment/readiness` → `{ ready: number, can_upgrade: number, cannot_upgrade: number, unknown: number, details: Equipment[] }`
- Readiness computed by `getWin11Readiness(os_version, processor_gen)` utility

### Frontend
- Readiness pie chart on dashboard (or equipment page)
- Readiness badge on equipment detail page
- "Cannot Upgrade" items highlighted in aging report

---

## 3. Equipment Timeline

Pure frontend component on equipment detail page.

### Data Source
Existing `maintenance_history[]` from `GET /api/equipment/:id` + equipment `created_at` as first event.

### Component
- Vertical timeline with left border line
- Each node: date, maintenance type badge, description (truncated), status pill
- First node: "Equipment registered" with created_at date
- Ordered newest-first

---

## 4. Aging Fleet Report

### API
- New endpoint: `GET /api/equipment/aging` → returns:
  - `age_distribution`: counts by bracket (0-2yr, 2-5yr, 5-8yr, 8+yr, unknown)
  - `flagged`: equipment with health_score < 40 OR (Windows 10 + cannot-upgrade hardware)
  - `os_distribution`: counts by os_version
  - `total_equipment`: total count

### Frontend
- New page or section accessible from equipment page
- Age distribution horizontal bar chart
- OS distribution pie chart (Windows 10 vs 11 vs other)
- "Needs Replacement" table with: asset_tag, type, make/model, OS, processor, health score, reason flagged
- Export CSV button on the flagged table

---

## 5. Bulk QR Print

### Frontend
- Checkboxes on equipment list rows
- "Print QR Labels" button appears when items selected
- Generates printable HTML page in new window:
  - A4 layout, 3 columns x 10 rows
  - Each cell: QR code (150px), asset tag text, room number text
  - Print-optimized CSS (@media print)
- Uses `qrcode` npm (already installed) to generate QR data URLs

---

## 6. Equipment Detail Enhancements

### Updated Detail Card
- OS version shown with EOL warning badge (red "EOL" badge if Windows 10)
- Processor gen shown
- Health score as colored progress bar with numeric value
- Win11 readiness badge (Ready/Can Upgrade/Cannot Upgrade)
- Timeline component replaces flat maintenance history table

---

## File Structure

### API New Files
| File | Responsibility |
|------|---------------|
| `api/src/services/health-score.ts` | Health score calculation + Win11 readiness logic |
| `api/src/routes/equipment-analytics.ts` | Readiness and aging report endpoints |

### Frontend New Files
| File | Responsibility |
|------|---------------|
| `web/src/components/equipment/EquipmentTimeline.tsx` | Vertical timeline component |
| `web/src/components/equipment/HealthScoreBar.tsx` | Colored progress bar for health score |
| `web/src/components/equipment/ReadinessBadge.tsx` | Win11 readiness status badge |
| `web/src/components/equipment/BulkQRPrint.tsx` | Bulk QR label generator |
| `web/src/pages/AgingReportPage.tsx` | Aging fleet report page |

### Modified Files
| File | Change |
|------|--------|
| `api/src/routes/equipment.ts` | Add health_score to list and detail responses |
| `api/src/router.ts` | Add readiness + aging routes |
| `web/src/components/equipment/EquipmentList.tsx` | Add health score column + checkboxes + bulk QR button |
| `web/src/components/equipment/EquipmentDetail.tsx` | Add health bar, readiness badge, OS/processor display |
| `web/src/pages/EquipmentDetailPage.tsx` | Replace history table with timeline |
| `web/src/pages/EquipmentPage.tsx` | Add link to aging report |
| `web/src/App.tsx` | Add aging report route |
