# Phase 1: Cross-Cutting Enhancements — Design Specification

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Mobile bottom nav, dark mode, CSV export, global search, keyboard shortcuts, schema migration

---

## 1. Mobile Bottom Navigation

**Problem:** Sidebar is hidden on mobile (lg:hidden). Technicians — the primary mobile users — have no navigation.

**Solution:** Fixed bottom nav bar on screens < 1024px with 5 items.

### Items
| Icon | Label | Route | Roles |
|------|-------|-------|-------|
| Grid | Dashboard | `/` | all |
| Monitor | Equipment | `/equipment` | all |
| Wrench | Maintenance | `/maintenance` | all |
| QrCode | Scan | `/scan` | all |
| Menu | More | dropdown | all |

**More dropdown** contains: Reports (lead/admin), Admin (admin only).

### Behavior
- Renders only below `lg` breakpoint (< 1024px)
- Fixed to bottom with `z-50`, background white, top border
- Active item: ghana-green text + filled icon
- 44px minimum touch targets
- `pb-safe` padding for iOS notch (env(safe-area-inset-bottom))
- Sidebar remains unchanged for desktop

### File
- Create: `web/src/components/layout/BottomNav.tsx`
- Modify: `web/src/components/layout/AppShell.tsx` — add BottomNav, add bottom padding to main content on mobile

---

## 2. Dark Mode

**Solution:** CSS class-based toggle with localStorage persistence.

### Implementation
- `web/tailwind.config.ts`: set `darkMode: "class"`
- Toggle button in Header (sun/moon SVG icons)
- On first visit: check `prefers-color-scheme: dark`, apply accordingly
- On toggle: add/remove `dark` class on `<html>`, save to `localStorage` key `rsimd_theme`

### Color Mapping
| Element | Light | Dark |
|---------|-------|------|
| Page bg | gray-50 | gray-900 |
| Card bg | white | gray-800 |
| Card border | gray-200 | gray-700 |
| Text primary | gray-900 | gray-100 |
| Text secondary | gray-500 | gray-400 |
| Input bg | white | gray-800 |
| Input border | gray-300 | gray-600 |
| Table header bg | gray-50 | gray-800 |
| Sidebar bg | white | gray-900 |
| Ghana green | #006B3F | #006B3F (unchanged) |
| Ghana gold | #FCD116 | #FCD116 (unchanged) |
| Ghana red | #CE1126 | #CE1126 (unchanged) |

### Files
- Create: `web/src/hooks/useTheme.ts` — toggle logic, localStorage, prefers-color-scheme
- Modify: `web/tailwind.config.ts` — add `darkMode: "class"`
- Modify: `web/src/components/layout/Header.tsx` — add toggle button
- Modify: all UI components — add `dark:` variants to className strings
- Modify: `web/index.html` — inline script to apply theme before render (prevents flash)

---

## 3. CSV Data Export

**Solution:** Client-side CSV generation utility, export button on table pages.

### Utility Function
```typescript
// web/src/lib/export-csv.ts
export function exportToCsv(filename: string, columns: {key: string, header: string}[], data: Record<string, unknown>[]): void
```

- Generates CSV string with headers from `columns[].header`
- Escapes values containing commas, quotes, or newlines
- Creates Blob with `text/csv` MIME type
- Triggers browser download with `filename`

### Integration Points
- Equipment list page: "Export" button in header, exports current filtered results
- Maintenance log list: "Export" button, exports current filtered results
- Admin tables (org entities, categories, technicians): "Export" button per tab

### Files
- Create: `web/src/lib/export-csv.ts`
- Modify: `web/src/pages/EquipmentPage.tsx` — add export button
- Modify: `web/src/pages/MaintenancePage.tsx` — add export button
- Modify: `web/src/components/admin/OrgEntityManager.tsx` — add export button
- Modify: `web/src/components/admin/CategoryManager.tsx` — add export button
- Modify: `web/src/components/admin/TechnicianManager.tsx` — add export button

---

## 4. Global Search

### API Endpoint
`GET /api/search?q=term` — requires auth.

Runs 3 parallel D1 queries:
```sql
SELECT id, asset_tag, type, make, model FROM equipment WHERE (asset_tag LIKE ? OR make LIKE ? OR model LIKE ?) AND status != 'decommissioned' LIMIT 5
SELECT id, description, maintenance_type, logged_date FROM maintenance_logs WHERE description LIKE ? LIMIT 5
SELECT id, name, code, type FROM org_entities WHERE (name LIKE ? OR code LIKE ?) AND is_active = 1 LIMIT 5
```

Returns: `{ equipment: [...], logs: [...], entities: [...] }`

### Frontend Component
- Search input in Header, `w-64` on desktop, icon-only toggle on mobile
- Debounced input (300ms) triggers `api.get("/search?q=...")`
- Dropdown results panel grouped by category (Equipment, Logs, Entities)
- Each result is a link: equipment → `/equipment/:id`, log → `/maintenance` (filtered), entity → `/admin`
- Minimum 2 characters to trigger search
- `Esc` closes dropdown, clicking outside closes dropdown
- `/` keyboard shortcut focuses the input

### Files
- Create: `api/src/routes/search.ts`
- Create: `web/src/components/layout/SearchBar.tsx`
- Modify: `api/src/router.ts` — add search route
- Modify: `web/src/components/layout/Header.tsx` — add SearchBar

---

## 5. Keyboard Shortcuts

### Shortcut Map
| Key | Action | Condition |
|-----|--------|-----------|
| `n` | Open new maintenance log form | No input focused |
| `s` | Navigate to /scan | No input focused |
| `/` | Focus global search input | No input focused |
| `Escape` | Close open modal | Modal is open |
| `?` | Toggle shortcut help overlay | No input focused |

### Implementation
- Single `useKeyboardShortcuts()` hook with global `keydown` listener
- Checks `document.activeElement` to skip when input/textarea/select is focused
- Dispatches custom events or calls navigation/state functions
- Shortcut help: small modal listing all shortcuts, triggered by `?`

### Files
- Create: `web/src/hooks/useKeyboardShortcuts.ts`
- Create: `web/src/components/ui/ShortcutHelp.tsx` — modal showing shortcuts
- Modify: `web/src/components/layout/AppShell.tsx` — mount the hook and ShortcutHelp

---

## 6. Schema Migration

Add two fields to the `equipment` table for Phase 2 readiness:

```sql
ALTER TABLE equipment ADD COLUMN os_version TEXT;
ALTER TABLE equipment ADD COLUMN processor_gen TEXT;
```

- `os_version`: e.g., "Windows 10 Pro", "Windows 11 Home", "Ubuntu 22.04"
- `processor_gen`: e.g., "10th Gen Intel", "Pentium", "AMD Ryzen 5"

### Files
- Create: `api/src/db/migration-001.sql`
- Modify: `api/src/db/schema.sql` — add columns to CREATE TABLE for fresh installs
- Modify: `api/src/types.ts` — add fields to EquipmentRow
- Modify: `api/src/routes/equipment.ts` — include new fields in create/update
- Modify: `web/src/types.ts` — add fields to Equipment type
- Modify: `web/src/components/equipment/EquipmentForm.tsx` — add OS and processor fields
- Modify: `web/src/lib/constants.ts` — add OS_OPTIONS constant
