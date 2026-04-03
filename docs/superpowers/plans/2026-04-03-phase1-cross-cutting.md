# Phase 1: Cross-Cutting Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mobile bottom navigation, dark mode, CSV export, global search, keyboard shortcuts, and equipment schema migration — foundational UX improvements that make every subsequent phase better.

**Architecture:** All changes are additive — no existing functionality is modified, only enhanced. Dark mode uses Tailwind's class strategy. Search adds one new API endpoint. Bottom nav and keyboard shortcuts are new components mounted in AppShell. CSV export is a pure utility function.

**Tech Stack:** React 18, Tailwind CSS (darkMode: "class"), Cloudflare Workers D1 (search + migration)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `web/src/components/layout/BottomNav.tsx` | Mobile bottom navigation bar (< lg) |
| `web/src/hooks/useTheme.ts` | Dark mode toggle with localStorage + prefers-color-scheme |
| `web/src/lib/export-csv.ts` | CSV generation utility |
| `web/src/components/layout/SearchBar.tsx` | Global search input + results dropdown |
| `web/src/hooks/useKeyboardShortcuts.ts` | Global keyboard shortcut handler |
| `web/src/components/ui/ShortcutHelp.tsx` | Shortcut reference overlay |
| `api/src/routes/search.ts` | Search API endpoint |
| `api/src/db/migration-001.sql` | Add os_version, processor_gen to equipment |

### Modified Files

| File | Change |
|------|--------|
| `web/tailwind.config.ts` | Add `darkMode: "class"` |
| `web/index.html` | Add theme init script before render |
| `web/src/components/layout/AppShell.tsx` | Add BottomNav, bottom padding, mount shortcuts |
| `web/src/components/layout/Header.tsx` | Add theme toggle, SearchBar |
| `web/src/components/layout/Sidebar.tsx` | Add dark mode classes |
| `web/src/components/ui/Button.tsx` | Add dark: variants |
| `web/src/components/ui/Input.tsx` | Add dark: variants |
| `web/src/components/ui/Card.tsx` | Add dark: variants |
| `web/src/components/ui/Select.tsx` | Add dark: variants |
| `web/src/components/ui/Modal.tsx` | Add dark: variants |
| `web/src/components/ui/Table.tsx` | Add dark: variants |
| `web/src/components/ui/Badge.tsx` | Add dark: variants |
| `web/src/components/ui/Toast.tsx` | Add dark: variants |
| `web/src/pages/LoginPage.tsx` | Add dark: variants |
| `web/src/pages/EquipmentPage.tsx` | Add export button |
| `web/src/pages/MaintenancePage.tsx` | Add export button |
| `web/src/components/admin/OrgEntityManager.tsx` | Add export button |
| `web/src/components/admin/CategoryManager.tsx` | Add export button |
| `web/src/components/admin/TechnicianManager.tsx` | Add export button |
| `api/src/router.ts` | Add search route |
| `api/src/db/schema.sql` | Add columns for fresh installs |
| `api/src/types.ts` | Add os_version, processor_gen to EquipmentRow |
| `api/src/routes/equipment.ts` | Include new fields in create/update |
| `web/src/types.ts` | Add os_version, processor_gen to Equipment |
| `web/src/components/equipment/EquipmentForm.tsx` | Add OS and processor fields |
| `web/src/lib/constants.ts` | Add OS_OPTIONS |

---

## Task 1: Mobile Bottom Navigation

**Files:**
- Create: `web/src/components/layout/BottomNav.tsx`
- Modify: `web/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create BottomNav component**

Create `web/src/components/layout/BottomNav.tsx`:

```tsx
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const MAIN_ITEMS = [
  { to: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { to: "/equipment", label: "Equipment", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { to: "/maintenance", label: "Logs", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { to: "/scan", label: "Scan", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
];

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const moreItems = [
    ...(user?.role === "lead" || user?.role === "admin" ? [{ to: "/reports", label: "Reports" }] : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {MAIN_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors ${
                isActive ? "text-ghana-green" : "text-gray-500 dark:text-gray-400"
              }`
            }
          >
            <svg className="h-6 w-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
        {moreItems.length > 0 && (
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center text-[10px] font-medium ${showMore ? "text-ghana-green" : "text-gray-500 dark:text-gray-400"}`}
            >
              <svg className="h-6 w-6 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              More
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0" onClick={() => setShowMore(false)} />
                <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                  {moreItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMore(false)}
                      className={({ isActive }) =>
                        `block px-4 py-2.5 text-sm font-medium ${
                          isActive ? "text-ghana-green bg-green-50 dark:bg-green-900/20" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update AppShell to include BottomNav**

Replace `web/src/components/layout/AppShell.tsx` with:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import type { ReactNode } from "react";

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          {children ?? <Outlet />}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/layout/
git commit -m "feat: mobile bottom navigation bar with role-based More menu"
```

---

## Task 2: Dark Mode

**Files:**
- Create: `web/src/hooks/useTheme.ts`
- Modify: `web/tailwind.config.ts`
- Modify: `web/index.html`
- Modify: `web/src/components/layout/Header.tsx`
- Modify: `web/src/components/layout/Sidebar.tsx`
- Modify: `web/src/components/ui/Button.tsx`
- Modify: `web/src/components/ui/Input.tsx`
- Modify: `web/src/components/ui/Card.tsx`
- Modify: `web/src/components/ui/Select.tsx`
- Modify: `web/src/components/ui/Modal.tsx`
- Modify: `web/src/components/ui/Table.tsx`
- Modify: `web/src/components/ui/Badge.tsx`
- Modify: `web/src/components/ui/Toast.tsx`
- Modify: `web/src/pages/LoginPage.tsx`

- [ ] **Step 1: Enable dark mode in Tailwind config**

Replace `web/tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
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

- [ ] **Step 2: Create useTheme hook**

Create `web/src/hooks/useTheme.ts`:

```tsx
import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "rsimd_theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
```

- [ ] **Step 3: Add theme init script to index.html to prevent flash**

In `web/index.html`, add this script inside `<head>` (before the closing `</head>` tag):

```html
<script>
  (function(){var t=localStorage.getItem('rsimd_theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})();
</script>
```

- [ ] **Step 4: Add theme toggle to Header**

Update `web/src/components/layout/Header.tsx` — add `useTheme` import and a toggle button before the offline indicators:

```tsx
import { useAuth } from "../../hooks/useAuth";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function Header() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, syncPending } = useOfflineSync();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 sm:px-6 flex items-center justify-between">
      <div className="lg:hidden">
        <h1 className="text-lg font-bold text-ghana-green">RSIMD-ITEMS</h1>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
        {!isOnline && <Badge variant="red">Offline</Badge>}
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={syncPending}
            className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 hover:bg-yellow-100 transition-colors"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
            {pendingCount} pending
          </button>
        )}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Add dark mode classes to all UI components**

For each UI component, add `dark:` class variants. The implementer must read each file and add the appropriate dark classes matching this mapping:

| Pattern | Light | Dark |
|---------|-------|------|
| `bg-white` | keep | add `dark:bg-gray-800` |
| `bg-gray-50` | keep | add `dark:bg-gray-900` |
| `bg-gray-100` | keep | add `dark:bg-gray-700` |
| `border-gray-200` | keep | add `dark:border-gray-700` |
| `border-gray-300` | keep | add `dark:border-gray-600` |
| `text-gray-900` | keep | add `dark:text-gray-100` |
| `text-gray-700` | keep | add `dark:text-gray-300` |
| `text-gray-500` | keep | add `dark:text-gray-400` |
| `text-gray-400` | keep | add `dark:text-gray-500` |
| `hover:bg-gray-50` | keep | add `dark:hover:bg-gray-700` |
| `hover:bg-gray-100` | keep | add `dark:hover:bg-gray-700` |
| `hover:bg-gray-200` | keep | add `dark:hover:bg-gray-600` |
| `placeholder:text-gray-400` | keep | add `dark:placeholder:text-gray-500` |
| `divide-gray-200` | keep | add `dark:divide-gray-700` |

Files to update with dark variants:
- `Button.tsx`: secondary variant bg/text, disabled state
- `Input.tsx`: bg, border, text, focus ring, error text, label, disabled
- `Card.tsx`: bg, border
- `Select.tsx`: bg, border, text, label, disabled
- `Modal.tsx`: bg, border, title text
- `Table.tsx`: header bg, row bg, text, dividers, hover state, empty message
- `Badge.tsx`: variant backgrounds (keep readable in dark mode)
- `Toast.tsx`: info variant
- `Sidebar.tsx`: bg, border, text, hover, active state, footer text
- `LoginPage.tsx`: page bg, card text

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add web/
git commit -m "feat: dark mode with system preference detection and manual toggle"
```

---

## Task 3: CSV Data Export

**Files:**
- Create: `web/src/lib/export-csv.ts`
- Modify: `web/src/pages/EquipmentPage.tsx`
- Modify: `web/src/pages/MaintenancePage.tsx`
- Modify: `web/src/components/admin/OrgEntityManager.tsx`
- Modify: `web/src/components/admin/CategoryManager.tsx`
- Modify: `web/src/components/admin/TechnicianManager.tsx`

- [ ] **Step 1: Create CSV export utility**

Create `web/src/lib/export-csv.ts`:

```typescript
export function exportToCsv(
  filename: string,
  columns: { key: string; header: string }[],
  data: Record<string, unknown>[]
): void {
  const headers = columns.map((c) => escapeCsvValue(c.header));
  const rows = data.map((row) =>
    columns.map((c) => escapeCsvValue(String(row[c.key] ?? "")))
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

- [ ] **Step 2: Add export button to EquipmentPage**

In `web/src/pages/EquipmentPage.tsx`, add an export button next to "Register Equipment". The EquipmentList component needs to expose its current data. The simplest approach: add a ref or callback that passes data up. However, to keep it simple and avoid refactoring EquipmentList, the export button can be added inside EquipmentList itself since it has access to the data.

Instead, modify `web/src/components/equipment/EquipmentList.tsx` to accept an optional `onDataLoaded` callback prop, and call it when data loads. Then EquipmentPage uses it to store data for export.

**Simpler approach:** Add an "Export" button directly inside each list component (EquipmentList, LogList, OrgEntityManager, etc.) since they already hold the data. This avoids prop drilling.

For each list component, add after the filter section:

```tsx
import { exportToCsv } from "../../lib/export-csv";

// Inside the component, add a button:
<Button
  variant="secondary"
  size="sm"
  onClick={() => exportToCsv("equipment", columns.filter(c => c.key !== "actions"), equipment as Record<string, unknown>[])}
>
  Export CSV
</Button>
```

Add this export button to:
- `EquipmentList.tsx` — exports filtered equipment data
- `LogList.tsx` — exports filtered maintenance logs (in `web/src/components/maintenance/LogList.tsx`)
- `OrgEntityManager.tsx` — exports entities
- `CategoryManager.tsx` — exports categories
- `TechnicianManager.tsx` — exports technicians

The export should exclude the "actions" column and use the non-render column keys.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/src/
git commit -m "feat: CSV export on all data tables — equipment, maintenance, admin"
```

---

## Task 4: Global Search API + Frontend

**Files:**
- Create: `api/src/routes/search.ts`
- Create: `web/src/components/layout/SearchBar.tsx`
- Modify: `api/src/router.ts`
- Modify: `web/src/components/layout/Header.tsx`

- [ ] **Step 1: Create search API endpoint**

Create `api/src/routes/search.ts`:

```typescript
import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

export async function search(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return jsonResponse({ equipment: [], logs: [], entities: [] }, 200, request);
  }

  const term = `%${q}%`;

  const [equipment, logs, entities] = await Promise.all([
    env.DB.prepare(
      "SELECT id, asset_tag, type, make, model FROM equipment WHERE (asset_tag LIKE ? OR make LIKE ? OR model LIKE ?) AND status != 'decommissioned' LIMIT 5"
    ).bind(term, term, term).all(),
    env.DB.prepare(
      "SELECT id, description, maintenance_type, logged_date FROM maintenance_logs WHERE description LIKE ? ORDER BY logged_date DESC LIMIT 5"
    ).bind(term).all(),
    env.DB.prepare(
      "SELECT id, name, code, type FROM org_entities WHERE (name LIKE ? OR code LIKE ?) AND is_active = 1 LIMIT 5"
    ).bind(term, term).all(),
  ]);

  return jsonResponse({
    equipment: equipment.results,
    logs: logs.results,
    entities: entities.results,
  }, 200, request);
}
```

- [ ] **Step 2: Register search route in router.ts**

Add before the 404 catch-all in `api/src/router.ts`:

```typescript
import { search } from "./routes/search";

// Search
router.get("/api/search", (request: Request, env: Env) => search(request, env));
```

- [ ] **Step 3: Create SearchBar component**

Create `web/src/components/layout/SearchBar.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api-client";

interface SearchResults {
  equipment: { id: string; asset_tag: string; type: string; make: string | null; model: string | null }[];
  logs: { id: string; description: string; maintenance_type: string; logged_date: string }[];
  entities: { id: string; name: string; code: string; type: string }[];
}

export function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose ref for keyboard shortcut focus
  useEffect(() => {
    const el = inputRef.current;
    if (el) (el as HTMLInputElement & { _searchInput: boolean })._searchInput = true;
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults(null); setIsOpen(false); return; }

    const timer = setTimeout(async () => {
      try {
        const data = await api.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(path: string) {
    setQuery("");
    setIsOpen(false);
    navigate(path);
  }

  const hasResults = results && (results.equipment.length > 0 || results.logs.length > 0 || results.entities.length > 0);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results && setIsOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
        placeholder="Search... (press /)"
        className="w-48 lg:w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
      />
      {isOpen && results && (
        <div className="absolute top-full mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {!hasResults && (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No results found</p>
          )}
          {results.equipment.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900">Equipment</p>
              {results.equipment.map((e) => (
                <button key={e.id} onClick={() => handleSelect(`/equipment/${e.id}`)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{e.asset_tag}</span> — {[e.make, e.model].filter(Boolean).join(" ") || e.type}
                </button>
              ))}
            </div>
          )}
          {results.logs.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900">Maintenance Logs</p>
              {results.logs.map((l) => (
                <button key={l.id} onClick={() => handleSelect("/maintenance")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{l.logged_date}</span> {l.description.slice(0, 60)}
                </button>
              ))}
            </div>
          )}
          {results.entities.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900">Entities</p>
              {results.entities.map((e) => (
                <button key={e.id} onClick={() => handleSelect("/admin")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{e.code}</span> — {e.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add SearchBar to Header**

In `web/src/components/layout/Header.tsx`, import and add `<SearchBar />` between the mobile title and the controls:

```tsx
import { SearchBar } from "./SearchBar";

// In the header, after the lg:hidden div and before the controls div:
<SearchBar />
```

- [ ] **Step 5: Verify both packages compile**

```bash
cd api && npx tsc --noEmit && cd ../web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add api/src/ web/src/
git commit -m "feat: global search — API endpoint with equipment/logs/entities, SearchBar with debounce"
```

---

## Task 5: Keyboard Shortcuts

**Files:**
- Create: `web/src/hooks/useKeyboardShortcuts.ts`
- Create: `web/src/components/ui/ShortcutHelp.tsx`
- Modify: `web/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create useKeyboardShortcuts hook**

Create `web/src/hooks/useKeyboardShortcuts.ts`:

```tsx
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutActions {
  openNewLog: () => void;
  toggleHelp: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;

    switch (e.key) {
      case "n":
        e.preventDefault();
        actions.openNewLog();
        break;
      case "s":
        e.preventDefault();
        navigate("/scan");
        break;
      case "/":
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>("input[placeholder*='Search']");
        searchInput?.focus();
        break;
      case "?":
        e.preventDefault();
        actions.toggleHelp();
        break;
      case "Escape":
        // Handled by Modal component already
        break;
    }
  }, [navigate, actions]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
```

- [ ] **Step 2: Create ShortcutHelp overlay**

Create `web/src/components/ui/ShortcutHelp.tsx`:

```tsx
import { Modal } from "./Modal";

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "N", description: "New maintenance log" },
  { key: "S", description: "Go to QR scanner" },
  { key: "/", description: "Focus search" },
  { key: "?", description: "Show this help" },
  { key: "Esc", description: "Close modal" },
];

export function ShortcutHelp({ isOpen, onClose }: ShortcutHelpProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-700 dark:text-gray-300">{s.description}</span>
            <kbd className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs font-mono text-gray-700 dark:text-gray-300">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Mount shortcuts in AppShell**

Update `web/src/components/layout/AppShell.tsx` to use the shortcuts hook and render ShortcutHelp + LogForm:

```tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { ShortcutHelp } from "../ui/ShortcutHelp";
import { LogForm } from "../maintenance/LogForm";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { ReactNode } from "react";

export function AppShell({ children }: { children?: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  useKeyboardShortcuts({
    openNewLog: () => setShowLogForm(true),
    toggleHelp: () => setShowHelp((v) => !v),
  });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          {children ?? <Outlet />}
        </main>
      </div>
      <BottomNav />
      <ShortcutHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <LogForm isOpen={showLogForm} onClose={() => setShowLogForm(false)} onSaved={() => setShowLogForm(false)} />
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add web/src/
git commit -m "feat: keyboard shortcuts — N for new log, S for scan, / for search, ? for help"
```

---

## Task 6: Schema Migration + Equipment Form Update

**Files:**
- Create: `api/src/db/migration-001.sql`
- Modify: `api/src/db/schema.sql`
- Modify: `api/src/types.ts`
- Modify: `api/src/routes/equipment.ts`
- Modify: `web/src/types.ts`
- Modify: `web/src/lib/constants.ts`
- Modify: `web/src/components/equipment/EquipmentForm.tsx`

- [ ] **Step 1: Create migration SQL**

Create `api/src/db/migration-001.sql`:

```sql
-- Migration 001: Add OS and processor fields to equipment
ALTER TABLE equipment ADD COLUMN os_version TEXT;
ALTER TABLE equipment ADD COLUMN processor_gen TEXT;
```

- [ ] **Step 2: Update schema.sql for fresh installs**

In `api/src/db/schema.sql`, add `os_version TEXT,` and `processor_gen TEXT,` after the `notes TEXT,` line in the `CREATE TABLE equipment` statement.

- [ ] **Step 3: Update API types**

In `api/src/types.ts`, add to `EquipmentRow`:

```typescript
os_version: string | null;
processor_gen: string | null;
```

- [ ] **Step 4: Update equipment route handler**

In `api/src/routes/equipment.ts`, update the create and update handlers to include `os_version` and `processor_gen` in their INSERT/UPDATE queries and request body types.

- [ ] **Step 5: Update frontend types**

In `web/src/types.ts`, add to `Equipment`:

```typescript
os_version: string | null;
processor_gen: string | null;
```

- [ ] **Step 6: Add OS_OPTIONS to constants**

In `web/src/lib/constants.ts`, add:

```typescript
export const OS_OPTIONS = [
  { value: "Windows 10 Home", label: "Windows 10 Home" },
  { value: "Windows 10 Pro", label: "Windows 10 Pro" },
  { value: "Windows 11 Home", label: "Windows 11 Home" },
  { value: "Windows 11 Pro", label: "Windows 11 Pro" },
  { value: "Ubuntu 22.04", label: "Ubuntu 22.04" },
  { value: "Ubuntu 24.04", label: "Ubuntu 24.04" },
  { value: "Other", label: "Other" },
] as const;

export const PROCESSOR_GEN_OPTIONS = [
  { value: "Pentium", label: "Pentium" },
  { value: "Celeron", label: "Celeron" },
  { value: "Core 2 Duo", label: "Core 2 Duo" },
  { value: "4th Gen Intel", label: "4th Gen Intel (Haswell)" },
  { value: "6th Gen Intel", label: "6th Gen Intel (Skylake)" },
  { value: "7th Gen Intel", label: "7th Gen Intel (Kaby Lake)" },
  { value: "8th Gen Intel", label: "8th Gen Intel (Coffee Lake)" },
  { value: "10th Gen Intel", label: "10th Gen Intel" },
  { value: "12th Gen Intel", label: "12th Gen Intel" },
  { value: "13th Gen Intel", label: "13th Gen Intel" },
  { value: "AMD Ryzen 3", label: "AMD Ryzen 3" },
  { value: "AMD Ryzen 5", label: "AMD Ryzen 5" },
  { value: "AMD Ryzen 7", label: "AMD Ryzen 7" },
  { value: "Other", label: "Other" },
] as const;
```

- [ ] **Step 7: Update EquipmentForm to include OS and processor fields**

In `web/src/components/equipment/EquipmentForm.tsx`, add two Select fields in the grid:

```tsx
import { OS_OPTIONS, PROCESSOR_GEN_OPTIONS } from "../../lib/constants";

// Add to form state:
os_version: "", processor_gen: ""

// Add to the form grid:
<Select label="Operating System" options={[...OS_OPTIONS]} value={form.os_version} onChange={(e) => setForm({ ...form, os_version: e.target.value })} placeholder="Select OS" />
<Select label="Processor Generation" options={[...PROCESSOR_GEN_OPTIONS]} value={form.processor_gen} onChange={(e) => setForm({ ...form, processor_gen: e.target.value })} placeholder="Select processor" />
```

- [ ] **Step 8: Run migration on remote D1**

```bash
cd api && npx wrangler d1 execute rsimd_items_db --remote --file=src/db/migration-001.sql
```

- [ ] **Step 9: Verify both packages compile**

```bash
cd api && npx tsc --noEmit && cd ../web && npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add api/ web/
git commit -m "feat: add OS version and processor generation fields to equipment — schema migration + form update"
```

---

## Verification Checklist

- [ ] Mobile: bottom nav shows 5 items on phone-sized screen, sidebar hidden
- [ ] Mobile: "More" dropdown shows Reports/Admin based on role
- [ ] Dark mode: toggle in header switches theme, persists on reload
- [ ] Dark mode: all components (cards, tables, modals, inputs) have readable dark variants
- [ ] Dark mode: system preference respected on first visit
- [ ] CSV export: button on equipment list, maintenance logs, all 3 admin tabs
- [ ] CSV export: downloads filtered data with correct column headers
- [ ] Search: typing 2+ characters shows categorized results
- [ ] Search: clicking a result navigates to the correct page
- [ ] Search: debounced (doesn't fire on every keystroke)
- [ ] Shortcuts: N opens log form, S goes to scan, / focuses search, ? shows help
- [ ] Shortcuts: don't fire when typing in an input field
- [ ] Schema: equipment form shows OS version and processor generation dropdowns
- [ ] Schema: new fields save and display on equipment detail page
- [ ] `cd api && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx vite build` — builds successfully
