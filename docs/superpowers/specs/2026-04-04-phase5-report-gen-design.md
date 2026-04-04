# Phase 5: Report Generation Enhancements — Design Specification

**Date:** 2026-04-04
**Status:** Approved

---

## 1. Two-Step Report Generation (Preview → Edit → Download)

### Flow
1. User clicks "Generate Report" with year/quarter
2. API generates aggregation + AI narratives but does NOT create DOCX yet
3. Returns all narratives + table data as JSON
4. Frontend shows a full-page preview with editable textareas for each narrative section
5. User reviews and edits any narrative (fixes AI errors, adds context)
6. User clicks "Generate DOCX" — sends edited narratives back to API
7. API assembles DOCX with the user-edited narratives + tables, uploads to R2
8. User downloads the final DOCX

### API Changes
- New endpoint: `POST /api/reports/preview` — runs aggregation + AI narratives, returns JSON (no DOCX, no R2)
- Modify: `POST /api/reports/generate` — now accepts `narratives` in body (user-edited), skips AI generation if provided

### Frontend Changes
- ReportGenerator becomes a multi-step wizard:
  1. Select year/quarter → "Generate Preview" button
  2. Preview page with all sections, editable textareas
  3. "Download DOCX" button sends edited narratives → gets DOCX back

---

## 2. Smart Challenges & Recommendations

### Data-Driven Generation
Instead of passing empty arrays to the AI, compute specific findings from the data:

**Challenges (computed from aggregation + equipment analytics):**
- Recurring issues: categories with >5 logs in the quarter for the same entity/room
- Equipment failures: devices with >3 corrective logs
- Resource gaps: entities with above-average maintenance but below-average equipment health
- Win10 EOL: count of devices running unsupported OS

**Recommendations (computed from patterns):**
- Equipment replacement: devices with health < 40 grouped by entity
- Infrastructure: rooms with recurring network/internet issues
- Procurement: equipment types with highest failure rates
- Training: maintenance types with escalated status

### API Changes
- Update `getReportAggregation` to compute `challenges` and `recommendations` arrays from D1 data instead of returning empty arrays

---

## File Structure

### API
| File | Change |
|------|--------|
| `api/src/routes/reports.ts` | Add `previewReport` handler, update `generateReport` to accept pre-edited narratives |
| `api/src/services/aggregator.ts` | Compute smart challenges + recommendations in `getReportAggregation` |
| `api/src/router.ts` | Add preview route |

### Frontend
| File | Change |
|------|--------|
| `web/src/components/reports/ReportPreview.tsx` | New — full preview with editable narrative textareas |
| `web/src/components/reports/ReportGenerator.tsx` | Refactor to two-step flow |
| `web/src/pages/ReportsPage.tsx` | Handle preview state |
