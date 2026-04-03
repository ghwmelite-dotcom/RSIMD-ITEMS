# RSIMD-ITEMS Plan 2: Core CRUD & Workflow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build full CRUD for org entities, equipment, maintenance categories, technicians, and maintenance logs — plus the QR scan-to-log workflow — with both API endpoints and React frontend pages.

**Architecture:** Each resource gets a route handler file (API) and corresponding React page/components (frontend). Routes use the existing `authenticate`/`requireRole` middleware. All queries use prepared statements via `db/queries.ts`. Frontend pages plug into the existing `AppShell` layout and `App.tsx` routing.

**Tech Stack:** Cloudflare Workers + D1 (API), React 18 + Tailwind CSS (frontend), qrcode npm (QR generation), html5-qrcode npm (QR scanning)

---

## File Structure

### API — New Route Files

| File | Responsibility |
|------|---------------|
| `api/src/routes/org-entities.ts` | CRUD handlers for org_entities (list with type filter, get, create, update, soft-delete) |
| `api/src/routes/equipment.ts` | CRUD handlers for equipment (list with filters, get with maintenance history, by-tag lookup, create, update, soft-delete) |
| `api/src/routes/categories.ts` | CRUD handlers for maintenance_categories (list, create, update) |
| `api/src/routes/technicians.ts` | CRUD handlers for technicians (list, get, create, update) |
| `api/src/routes/maintenance.ts` | CRUD handlers for maintenance_logs (list with filters, get, create, update, bulk-sync) |

### API — Modified Files

| File | Change |
|------|--------|
| `api/src/router.ts` | Register all new routes |
| `api/src/db/queries.ts` | Add query helpers for all resources |

### Frontend — New UI Components

| File | Responsibility |
|------|---------------|
| `web/src/components/ui/Select.tsx` | Reusable select dropdown with label/error |
| `web/src/components/ui/Table.tsx` | Reusable table with header/rows |
| `web/src/components/ui/Badge.tsx` | Status badge with color variants |
| `web/src/components/ui/Modal.tsx` | Modal dialog for forms and confirmations |
| `web/src/components/ui/StatusPill.tsx` | Colored status indicator pill |
| `web/src/components/ui/Toast.tsx` | Toast notification system |

### Frontend — Feature Pages & Components

| File | Responsibility |
|------|---------------|
| `web/src/pages/EquipmentPage.tsx` | Equipment list page with filters |
| `web/src/pages/EquipmentDetailPage.tsx` | Single equipment detail + maintenance history |
| `web/src/pages/MaintenancePage.tsx` | Maintenance log list with filters |
| `web/src/pages/ScanPage.tsx` | QR scanner page |
| `web/src/pages/AdminPage.tsx` | Admin panel with tabs |
| `web/src/components/equipment/EquipmentList.tsx` | Equipment table with status badges |
| `web/src/components/equipment/EquipmentForm.tsx` | Create/edit equipment modal form |
| `web/src/components/equipment/EquipmentDetail.tsx` | Equipment info card + QR code display |
| `web/src/components/equipment/QRScanner.tsx` | Camera-based QR scanner wrapper |
| `web/src/components/maintenance/LogForm.tsx` | Maintenance log creation form |
| `web/src/components/maintenance/LogList.tsx` | Maintenance log table |
| `web/src/components/maintenance/QuickLog.tsx` | Post-QR-scan quick maintenance form |
| `web/src/components/admin/OrgEntityManager.tsx` | CRUD UI for org entities |
| `web/src/components/admin/CategoryManager.tsx` | CRUD UI for maintenance categories |
| `web/src/components/admin/TechnicianManager.tsx` | CRUD UI for technicians |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `web/src/App.tsx` | Add routes for all new pages |
| `web/package.json` | Add `qrcode` and `html5-qrcode` dependencies |

---

## Task 1: Shared UI Components (Select, Table, Badge, Modal, StatusPill, Toast)

**Files:**
- Create: `web/src/components/ui/Select.tsx`
- Create: `web/src/components/ui/Table.tsx`
- Create: `web/src/components/ui/Badge.tsx`
- Create: `web/src/components/ui/Modal.tsx`
- Create: `web/src/components/ui/StatusPill.tsx`
- Create: `web/src/components/ui/Toast.tsx`
- Create: `web/src/context/ToastContext.tsx`
- Create: `web/src/hooks/useToast.ts`

- [ ] **Step 1: Create Select component**

Create `web/src/components/ui/Select.tsx`:

```tsx
import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green disabled:bg-gray-50 disabled:text-gray-500 ${error ? "border-ghana-red" : ""} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-ghana-red">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
```

- [ ] **Step 2: Create Table component**

Create `web/src/components/ui/Table.tsx`:

```tsx
import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = "No data found",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create Badge component**

Create `web/src/components/ui/Badge.tsx`:

```tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "gold" | "red" | "gray";
  className?: string;
}

const variants = {
  green: "bg-green-100 text-green-800",
  gold: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-800",
};

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Create StatusPill component**

Create `web/src/components/ui/StatusPill.tsx`:

```tsx
import { Badge } from "./Badge";

const STATUS_VARIANTS: Record<string, "green" | "gold" | "red" | "gray"> = {
  active: "green",
  completed: "green",
  faulty: "red",
  escalated: "red",
  under_repair: "gold",
  in_progress: "gold",
  pending: "gray",
  decommissioned: "gray",
};

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  const variant = STATUS_VARIANTS[status] ?? "gray";
  const label = status.replace(/_/g, " ");
  return <Badge variant={variant}>{label}</Badge>;
}
```

- [ ] **Step 5: Create Modal component**

Create `web/src/components/ui/Modal.tsx`:

```tsx
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl ${sizes[size]} w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create Toast system**

Create `web/src/components/ui/Toast.tsx`:

```tsx
import { useEffect } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const typeStyles = {
  success: "bg-ghana-green text-white",
  error: "bg-ghana-red text-white",
  info: "bg-gray-800 text-white",
};

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${typeStyles[toast.type]}`}>
      {toast.message}
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
```

Create `web/src/context/ToastContext.tsx`:

```tsx
import { createContext, useState, useCallback, type ReactNode } from "react";
import { ToastContainer, type ToastMessage } from "../components/ui/Toast";

interface ToastContextValue {
  showToast: (type: ToastMessage["type"], message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastMessage["type"], message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
```

Create `web/src/hooks/useToast.ts`:

```tsx
import { useContext } from "react";
import { ToastContext } from "../context/ToastContext";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add web/src/components/ui/ web/src/context/ToastContext.tsx web/src/hooks/useToast.ts
git commit -m "feat: shared UI components — Select, Table, Badge, Modal, StatusPill, Toast"
```

---

## Task 2: Org Entity & Category & Technician API Routes

**Files:**
- Create: `api/src/routes/org-entities.ts`
- Create: `api/src/routes/categories.ts`
- Create: `api/src/routes/technicians.ts`
- Modify: `api/src/router.ts`
- Modify: `api/src/db/queries.ts`

- [ ] **Step 1: Add org entity query helpers to queries.ts**

Append to `api/src/db/queries.ts`:

```typescript
import type { TechnicianRow, OrgEntityRow, MaintenanceCategoryRow } from "../types";

// ... existing getTechnicianByEmail and getTechnicianById remain ...

export async function listOrgEntities(
  db: D1Database,
  typeFilter?: string
): Promise<OrgEntityRow[]> {
  if (typeFilter) {
    const result = await db
      .prepare("SELECT * FROM org_entities WHERE is_active = 1 AND type = ? ORDER BY type, name")
      .bind(typeFilter)
      .all<OrgEntityRow>();
    return result.results;
  }
  const result = await db
    .prepare("SELECT * FROM org_entities WHERE is_active = 1 ORDER BY type, name")
    .all<OrgEntityRow>();
  return result.results;
}

export async function getOrgEntity(db: D1Database, id: string): Promise<OrgEntityRow | null> {
  return db.prepare("SELECT * FROM org_entities WHERE id = ?").bind(id).first<OrgEntityRow>();
}

export async function listCategories(db: D1Database): Promise<MaintenanceCategoryRow[]> {
  const result = await db
    .prepare("SELECT * FROM maintenance_categories WHERE is_active = 1 ORDER BY name")
    .all<MaintenanceCategoryRow>();
  return result.results;
}

export async function listTechnicians(db: D1Database): Promise<TechnicianRow[]> {
  const result = await db
    .prepare("SELECT id, name, role, email, phone, assigned_entities, is_active, created_at, updated_at FROM technicians WHERE is_active = 1 ORDER BY name")
    .all<TechnicianRow>();
  return result.results;
}
```

Note: The import line at the top of queries.ts must be updated to include the new types.

- [ ] **Step 2: Create org-entities route handler**

Create `api/src/routes/org-entities.ts`:

```typescript
import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { listOrgEntities, getOrgEntity } from "../db/queries";

export async function listEntities(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const typeFilter = url.searchParams.get("type") ?? undefined;
  const entities = await listOrgEntities(env.DB, typeFilter);

  return jsonResponse(
    entities.map((e) => ({
      ...e,
      rooms: JSON.parse(e.rooms),
      is_active: Boolean(e.is_active),
    })),
    200,
    request
  );
}

export async function getEntity(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const entity = await getOrgEntity(env.DB, id);
  if (!entity) return errorResponse("Entity not found", 404, request);

  return jsonResponse(
    { ...entity, rooms: JSON.parse(entity.rooms), is_active: Boolean(entity.is_active) },
    200,
    request
  );
}

export async function createEntity(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  let body: { name?: string; code?: string; type?: string; rooms?: string[] };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  const { name, code, type, rooms } = body;
  if (!name || !code || !type) return errorResponse("name, code, and type are required", 400, request);
  if (!["directorate", "unit", "secretariat"].includes(type)) {
    return errorResponse("type must be directorate, unit, or secretariat", 400, request);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO org_entities (id, name, code, type, rooms) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, name, code, type, JSON.stringify(rooms ?? [])).run();

  const entity = await getOrgEntity(env.DB, id);
  return jsonResponse(
    { ...entity!, rooms: JSON.parse(entity!.rooms), is_active: true },
    201,
    request
  );
}

export async function updateEntity(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  const existing = await getOrgEntity(env.DB, id);
  if (!existing) return errorResponse("Entity not found", 404, request);

  let body: { name?: string; code?: string; type?: string; rooms?: string[] };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  const name = body.name ?? existing.name;
  const code = body.code ?? existing.code;
  const type = body.type ?? existing.type;
  const rooms = body.rooms ? JSON.stringify(body.rooms) : existing.rooms;

  await env.DB.prepare(
    "UPDATE org_entities SET name = ?, code = ?, type = ?, rooms = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(name, code, type, rooms, id).run();

  const updated = await getOrgEntity(env.DB, id);
  return jsonResponse(
    { ...updated!, rooms: JSON.parse(updated!.rooms), is_active: Boolean(updated!.is_active) },
    200,
    request
  );
}

export async function deleteEntity(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  const existing = await getOrgEntity(env.DB, id);
  if (!existing) return errorResponse("Entity not found", 404, request);

  await env.DB.prepare(
    "UPDATE org_entities SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  return jsonResponse({ success: true }, 200, request);
}
```

- [ ] **Step 3: Create categories route handler**

Create `api/src/routes/categories.ts`:

```typescript
import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { listCategories } from "../db/queries";

export async function getCategories(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const categories = await listCategories(env.DB);
  return jsonResponse(
    categories.map((c) => ({ ...c, is_active: Boolean(c.is_active) })),
    200,
    request
  );
}

export async function createCategory(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  let body: { name?: string; description?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  if (!body.name) return errorResponse("name is required", 400, request);

  const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare(
    "INSERT INTO maintenance_categories (id, name, description) VALUES (?, ?, ?)"
  ).bind(id, body.name, body.description ?? null).run();

  return jsonResponse({ id, name: body.name, description: body.description ?? null, is_active: true }, 201, request);
}

export async function updateCategory(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  const existing = await env.DB.prepare("SELECT * FROM maintenance_categories WHERE id = ?").bind(id).first();
  if (!existing) return errorResponse("Category not found", 404, request);

  let body: { name?: string; description?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  const name = body.name ?? (existing as { name: string }).name;
  const description = body.description !== undefined ? body.description : (existing as { description: string | null }).description;

  await env.DB.prepare(
    "UPDATE maintenance_categories SET name = ?, description = ? WHERE id = ?"
  ).bind(name, description, id).run();

  return jsonResponse({ id, name, description, is_active: true }, 200, request);
}
```

- [ ] **Step 4: Create technicians route handler**

Create `api/src/routes/technicians.ts`:

```typescript
import { hash } from "bcryptjs";
import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { listTechnicians, getTechnicianById } from "../db/queries";

function sanitizeTechnician(t: { id: string; name: string; role: string; email: string | null; phone: string | null; assigned_entities: string }) {
  let entities: unknown = [];
  try { entities = JSON.parse(t.assigned_entities); } catch { entities = []; }
  return { id: t.id, name: t.name, role: t.role, email: t.email, phone: t.phone, assigned_entities: entities };
}

export async function getTechnicians(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const technicians = await listTechnicians(env.DB);
  return jsonResponse(technicians.map(sanitizeTechnician), 200, request);
}

export async function getTechnician(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const tech = await getTechnicianById(env.DB, id);
  if (!tech) return errorResponse("Technician not found", 404, request);

  return jsonResponse(sanitizeTechnician(tech), 200, request);
}

export async function createTechnician(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  let body: { name?: string; email?: string; phone?: string; role?: string; password?: string; assigned_entities?: string[] };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  if (!body.name || !body.email || !body.password) {
    return errorResponse("name, email, and password are required", 400, request);
  }

  const id = `tech-${crypto.randomUUID().slice(0, 8)}`;
  const passwordHash = await hash(body.password, 10);

  await env.DB.prepare(
    "INSERT INTO technicians (id, name, role, email, phone, assigned_entities, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id, body.name, body.role ?? "technician", body.email, body.phone ?? null,
    JSON.stringify(body.assigned_entities ?? []), passwordHash
  ).run();

  return jsonResponse({ id, name: body.name, role: body.role ?? "technician", email: body.email, phone: body.phone ?? null, assigned_entities: body.assigned_entities ?? [] }, 201, request);
}

export async function updateTechnician(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  const existing = await getTechnicianById(env.DB, id);
  if (!existing) return errorResponse("Technician not found", 404, request);

  let body: { name?: string; email?: string; phone?: string; role?: string; password?: string; assigned_entities?: string[] };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  const name = body.name ?? existing.name;
  const email = body.email ?? existing.email;
  const phone = body.phone !== undefined ? body.phone : existing.phone;
  const role = body.role ?? existing.role;
  const assignedEntities = body.assigned_entities ? JSON.stringify(body.assigned_entities) : existing.assigned_entities;

  if (body.password) {
    const passwordHash = await hash(body.password, 10);
    await env.DB.prepare(
      "UPDATE technicians SET name = ?, email = ?, phone = ?, role = ?, assigned_entities = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(name, email, phone, role, assignedEntities, passwordHash, id).run();
  } else {
    await env.DB.prepare(
      "UPDATE technicians SET name = ?, email = ?, phone = ?, role = ?, assigned_entities = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(name, email, phone, role, assignedEntities, id).run();
  }

  const updated = await getTechnicianById(env.DB, id);
  return jsonResponse(sanitizeTechnician(updated!), 200, request);
}
```

- [ ] **Step 5: Register all routes in router.ts**

Replace `api/src/router.ts` with:

```typescript
import { Router } from "itty-router";
import type { Env } from "./types";
import { login, logout, me } from "./routes/auth";
import { listEntities, getEntity, createEntity, updateEntity, deleteEntity } from "./routes/org-entities";
import { getCategories, createCategory, updateCategory } from "./routes/categories";
import { getTechnicians, getTechnician, createTechnician, updateTechnician } from "./routes/technicians";

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

// Org Entities
router.get("/api/org-entities", (request: Request, env: Env) => listEntities(request, env));
router.get("/api/org-entities/:id", (request: Request, env: Env) => getEntity(request, env, (request as unknown as { params: { id: string } }).params.id));
router.post("/api/org-entities", (request: Request, env: Env) => createEntity(request, env));
router.put("/api/org-entities/:id", (request: Request, env: Env) => updateEntity(request, env, (request as unknown as { params: { id: string } }).params.id));
router.delete("/api/org-entities/:id", (request: Request, env: Env) => deleteEntity(request, env, (request as unknown as { params: { id: string } }).params.id));

// Categories
router.get("/api/categories", (request: Request, env: Env) => getCategories(request, env));
router.post("/api/categories", (request: Request, env: Env) => createCategory(request, env));
router.put("/api/categories/:id", (request: Request, env: Env) => updateCategory(request, env, (request as unknown as { params: { id: string } }).params.id));

// Technicians
router.get("/api/technicians", (request: Request, env: Env) => getTechnicians(request, env));
router.get("/api/technicians/:id", (request: Request, env: Env) => getTechnician(request, env, (request as unknown as { params: { id: string } }).params.id));
router.post("/api/technicians", (request: Request, env: Env) => createTechnician(request, env));
router.put("/api/technicians/:id", (request: Request, env: Env) => updateTechnician(request, env, (request as unknown as { params: { id: string } }).params.id));

// 404 catch-all
router.all("*", () => {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});

export { router };
```

**Important:** itty-router attaches `params` to the request object. The `(request as unknown as { params: { id: string } }).params.id` cast extracts route params. If this pattern is too verbose, the implementer may use itty-router's `IRequest` type instead — either approach is acceptable as long as TypeScript compiles clean.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 7: Test org entities API**

```bash
cd api && npm run db:init && npm run db:seed
npx wrangler dev --local &
sleep 3

# Login
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@ohcs.gov.gh","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# List all entities
curl -s http://localhost:8787/api/org-entities -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List only directorates
curl -s "http://localhost:8787/api/org-entities?type=directorate" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get single entity
curl -s http://localhost:8787/api/org-entities/dir-rsimd -H "Authorization: Bearer $TOKEN"

kill %1
```

Expected: 11 entities total, 5 directorates when filtered, RSIMD entity when fetched by ID.

- [ ] **Step 8: Commit**

```bash
git add api/src/
git commit -m "feat: org entity, category, and technician CRUD API routes"
```

---

## Task 3: Equipment API Route

**Files:**
- Create: `api/src/routes/equipment.ts`
- Modify: `api/src/router.ts`
- Modify: `api/src/db/queries.ts`

- [ ] **Step 1: Add equipment query helpers to queries.ts**

Append to `api/src/db/queries.ts`:

```typescript
import type { TechnicianRow, OrgEntityRow, MaintenanceCategoryRow, EquipmentRow, MaintenanceLogRow } from "../types";

export async function listEquipment(
  db: D1Database,
  filters: { org_entity_id?: string; status?: string; type?: string }
): Promise<EquipmentRow[]> {
  let sql = "SELECT * FROM equipment WHERE 1=1";
  const binds: string[] = [];

  if (filters.org_entity_id) {
    sql += " AND org_entity_id = ?";
    binds.push(filters.org_entity_id);
  }
  if (filters.status) {
    sql += " AND status = ?";
    binds.push(filters.status);
  }
  if (filters.type) {
    sql += " AND type = ?";
    binds.push(filters.type);
  }

  sql += " AND status != 'decommissioned' ORDER BY created_at DESC";

  const stmt = db.prepare(sql);
  const result = binds.length > 0 ? await stmt.bind(...binds).all<EquipmentRow>() : await stmt.all<EquipmentRow>();
  return result.results;
}

export async function getEquipmentById(db: D1Database, id: string): Promise<EquipmentRow | null> {
  return db.prepare("SELECT * FROM equipment WHERE id = ?").bind(id).first<EquipmentRow>();
}

export async function getEquipmentByTag(db: D1Database, tag: string): Promise<EquipmentRow | null> {
  return db.prepare("SELECT * FROM equipment WHERE asset_tag = ?").bind(tag).first<EquipmentRow>();
}

export async function getMaintenanceForEquipment(db: D1Database, equipmentId: string): Promise<MaintenanceLogRow[]> {
  const result = await db
    .prepare("SELECT * FROM maintenance_logs WHERE equipment_id = ? ORDER BY logged_date DESC LIMIT 50")
    .bind(equipmentId)
    .all<MaintenanceLogRow>();
  return result.results;
}
```

- [ ] **Step 2: Create equipment route handler**

Create `api/src/routes/equipment.ts`:

```typescript
import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { listEquipment, getEquipmentById, getEquipmentByTag, getMaintenanceForEquipment } from "../db/queries";

export async function listEquipmentHandler(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const equipment = await listEquipment(env.DB, {
    org_entity_id: url.searchParams.get("org_entity_id") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });

  return jsonResponse(equipment, 200, request);
}

export async function getEquipmentHandler(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const equipment = await getEquipmentById(env.DB, id);
  if (!equipment) return errorResponse("Equipment not found", 404, request);

  const history = await getMaintenanceForEquipment(env.DB, id);
  return jsonResponse({ equipment, maintenance_history: history }, 200, request);
}

export async function getEquipmentByTagHandler(request: Request, env: Env, assetTag: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const equipment = await getEquipmentByTag(env.DB, assetTag);
  if (!equipment) return errorResponse("Equipment not found for tag", 404, request);

  return jsonResponse(equipment, 200, request);
}

export async function createEquipmentHandler(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  let body: {
    type?: string; make?: string; model?: string; processor?: string;
    serial_number?: string; org_entity_id?: string; room_number?: string;
    installed_date?: string; notes?: string;
  };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  if (!body.type || !body.org_entity_id) {
    return errorResponse("type and org_entity_id are required", 400, request);
  }

  const id = crypto.randomUUID();
  const assetTag = `OHCS-${body.type?.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;

  await env.DB.prepare(
    `INSERT INTO equipment (id, asset_tag, type, make, model, processor, serial_number, org_entity_id, room_number, installed_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, assetTag, body.type, body.make ?? null, body.model ?? null,
    body.processor ?? null, body.serial_number ?? null, body.org_entity_id,
    body.room_number ?? null, body.installed_date ?? null, body.notes ?? null
  ).run();

  const created = await getEquipmentById(env.DB, id);
  return jsonResponse(created, 201, request);
}

export async function updateEquipmentHandler(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const existing = await getEquipmentById(env.DB, id);
  if (!existing) return errorResponse("Equipment not found", 404, request);

  let body: {
    type?: string; make?: string; model?: string; processor?: string;
    serial_number?: string; org_entity_id?: string; room_number?: string;
    status?: string; installed_date?: string; notes?: string;
  };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  await env.DB.prepare(
    `UPDATE equipment SET type = ?, make = ?, model = ?, processor = ?, serial_number = ?,
     org_entity_id = ?, room_number = ?, status = ?, installed_date = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.type ?? existing.type, body.make ?? existing.make, body.model ?? existing.model,
    body.processor ?? existing.processor, body.serial_number ?? existing.serial_number,
    body.org_entity_id ?? existing.org_entity_id, body.room_number ?? existing.room_number,
    body.status ?? existing.status, body.installed_date ?? existing.installed_date,
    body.notes ?? existing.notes, id
  ).run();

  const updated = await getEquipmentById(env.DB, id);
  return jsonResponse(updated, 200, request);
}

export async function deleteEquipmentHandler(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const existing = await getEquipmentById(env.DB, id);
  if (!existing) return errorResponse("Equipment not found", 404, request);

  await env.DB.prepare(
    "UPDATE equipment SET status = 'decommissioned', updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  return jsonResponse({ success: true }, 200, request);
}
```

- [ ] **Step 3: Add equipment routes to router.ts**

Add before the 404 catch-all in `api/src/router.ts`:

```typescript
import { listEquipmentHandler, getEquipmentHandler, getEquipmentByTagHandler, createEquipmentHandler, updateEquipmentHandler, deleteEquipmentHandler } from "./routes/equipment";

// Equipment
router.get("/api/equipment", (request: Request, env: Env) => listEquipmentHandler(request, env));
router.get("/api/equipment/by-tag/:assetTag", (request: Request, env: Env) => getEquipmentByTagHandler(request, env, (request as unknown as { params: { assetTag: string } }).params.assetTag));
router.get("/api/equipment/:id", (request: Request, env: Env) => getEquipmentHandler(request, env, (request as unknown as { params: { id: string } }).params.id));
router.post("/api/equipment", (request: Request, env: Env) => createEquipmentHandler(request, env));
router.put("/api/equipment/:id", (request: Request, env: Env) => updateEquipmentHandler(request, env, (request as unknown as { params: { id: string } }).params.id));
router.delete("/api/equipment/:id", (request: Request, env: Env) => deleteEquipmentHandler(request, env, (request as unknown as { params: { id: string } }).params.id));
```

**Important:** The `/api/equipment/by-tag/:assetTag` route MUST be registered BEFORE `/api/equipment/:id` so it matches first.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Test equipment API**

```bash
cd api && npx wrangler dev --local &
sleep 3
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@ohcs.gov.gh","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Create equipment
curl -s -X POST http://localhost:8787/api/equipment -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"type":"desktop","make":"HP","model":"ProDesk 400","org_entity_id":"dir-rsimd","room_number":"12"}'

# List equipment
curl -s http://localhost:8787/api/equipment -H "Authorization: Bearer $TOKEN"

kill %1
```

Expected: Equipment created with auto-generated `asset_tag` starting with `OHCS-DES-`.

- [ ] **Step 6: Commit**

```bash
git add api/src/
git commit -m "feat: equipment CRUD API with asset tag generation and by-tag lookup"
```

---

## Task 4: Maintenance Log API Route

**Files:**
- Create: `api/src/routes/maintenance.ts`
- Modify: `api/src/router.ts`
- Modify: `api/src/db/queries.ts`

- [ ] **Step 1: Add maintenance query helpers to queries.ts**

Append to `api/src/db/queries.ts`:

```typescript
export async function listMaintenanceLogs(
  db: D1Database,
  filters: { year?: number; quarter?: number; maintenance_type?: string; org_entity_id?: string; category_id?: string }
): Promise<MaintenanceLogRow[]> {
  let sql = "SELECT * FROM maintenance_logs WHERE 1=1";
  const binds: (string | number)[] = [];

  if (filters.year) { sql += " AND year = ?"; binds.push(filters.year); }
  if (filters.quarter) { sql += " AND quarter = ?"; binds.push(filters.quarter); }
  if (filters.maintenance_type) { sql += " AND maintenance_type = ?"; binds.push(filters.maintenance_type); }
  if (filters.org_entity_id) { sql += " AND org_entity_id = ?"; binds.push(filters.org_entity_id); }
  if (filters.category_id) { sql += " AND category_id = ?"; binds.push(filters.category_id); }

  sql += " ORDER BY logged_date DESC LIMIT 200";

  const stmt = db.prepare(sql);
  const result = binds.length > 0 ? await stmt.bind(...binds).all<MaintenanceLogRow>() : await stmt.all<MaintenanceLogRow>();
  return result.results;
}

export async function getMaintenanceLog(db: D1Database, id: string): Promise<MaintenanceLogRow | null> {
  return db.prepare("SELECT * FROM maintenance_logs WHERE id = ?").bind(id).first<MaintenanceLogRow>();
}
```

- [ ] **Step 2: Create maintenance route handler**

Create `api/src/routes/maintenance.ts`:

```typescript
import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { listMaintenanceLogs, getMaintenanceLog } from "../db/queries";

function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

export async function listLogs(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const logs = await listMaintenanceLogs(env.DB, {
    year: url.searchParams.get("year") ? Number(url.searchParams.get("year")) : undefined,
    quarter: url.searchParams.get("quarter") ? Number(url.searchParams.get("quarter")) : undefined,
    maintenance_type: url.searchParams.get("maintenance_type") ?? undefined,
    org_entity_id: url.searchParams.get("org_entity_id") ?? undefined,
    category_id: url.searchParams.get("category_id") ?? undefined,
  });

  return jsonResponse(
    logs.map((l) => ({ ...l, photo_urls: JSON.parse(l.photo_urls) })),
    200,
    request
  );
}

export async function getLog(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const log = await getMaintenanceLog(env.DB, id);
  if (!log) return errorResponse("Maintenance log not found", 404, request);

  return jsonResponse({ ...log, photo_urls: JSON.parse(log.photo_urls) }, 200, request);
}

export async function createLog(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  let body: {
    equipment_id?: string; org_entity_id?: string; maintenance_type?: string;
    category_id?: string; room_number?: string; description?: string;
    resolution?: string; status?: string; logged_date?: string;
  };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  if (!body.org_entity_id || !body.maintenance_type || !body.description) {
    return errorResponse("org_entity_id, maintenance_type, and description are required", 400, request);
  }

  const loggedDate = body.logged_date ?? new Date().toISOString().slice(0, 10);
  const date = new Date(loggedDate);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const quarter = getQuarter(month);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO maintenance_logs (id, equipment_id, technician_id, org_entity_id, maintenance_type,
     category_id, room_number, description, resolution, status, logged_date, quarter, month, year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.equipment_id ?? null, sessionOrError.technician_id, body.org_entity_id,
    body.maintenance_type, body.category_id ?? null, body.room_number ?? null,
    body.description, body.resolution ?? null, body.status ?? "completed",
    loggedDate, quarter, month, year
  ).run();

  const created = await getMaintenanceLog(env.DB, id);
  return jsonResponse({ ...created!, photo_urls: JSON.parse(created!.photo_urls) }, 201, request);
}

export async function updateLog(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const existing = await getMaintenanceLog(env.DB, id);
  if (!existing) return errorResponse("Maintenance log not found", 404, request);

  let body: {
    maintenance_type?: string; category_id?: string; room_number?: string;
    description?: string; resolution?: string; status?: string;
  };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  await env.DB.prepare(
    `UPDATE maintenance_logs SET maintenance_type = ?, category_id = ?, room_number = ?,
     description = ?, resolution = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(
    body.maintenance_type ?? existing.maintenance_type,
    body.category_id !== undefined ? body.category_id : existing.category_id,
    body.room_number !== undefined ? body.room_number : existing.room_number,
    body.description ?? existing.description,
    body.resolution !== undefined ? body.resolution : existing.resolution,
    body.status ?? existing.status,
    id
  ).run();

  const updated = await getMaintenanceLog(env.DB, id);
  return jsonResponse({ ...updated!, photo_urls: JSON.parse(updated!.photo_urls) }, 200, request);
}

export async function bulkSync(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  let body: { logs: Array<{
    equipment_id?: string; org_entity_id: string; maintenance_type: string;
    category_id?: string; room_number?: string; description: string;
    resolution?: string; status?: string; logged_date: string;
  }> };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  if (!Array.isArray(body.logs)) return errorResponse("logs array is required", 400, request);

  let syncedCount = 0;
  const errors: string[] = [];

  for (const log of body.logs) {
    try {
      const loggedDate = log.logged_date;
      const date = new Date(loggedDate);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const quarter = getQuarter(month);

      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO maintenance_logs (id, equipment_id, technician_id, org_entity_id, maintenance_type,
         category_id, room_number, description, resolution, status, logged_date, quarter, month, year,
         created_offline, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
      ).bind(
        id, log.equipment_id ?? null, sessionOrError.technician_id, log.org_entity_id,
        log.maintenance_type, log.category_id ?? null, log.room_number ?? null,
        log.description, log.resolution ?? null, log.status ?? "completed",
        loggedDate, quarter, month, year
      ).run();
      syncedCount++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return jsonResponse({ synced_count: syncedCount, errors }, 200, request);
}
```

- [ ] **Step 3: Add maintenance routes to router.ts**

Add before the 404 catch-all:

```typescript
import { listLogs, getLog, createLog, updateLog, bulkSync } from "./routes/maintenance";

// Maintenance Logs
router.get("/api/maintenance", (request: Request, env: Env) => listLogs(request, env));
router.post("/api/maintenance", (request: Request, env: Env) => createLog(request, env));
router.post("/api/maintenance/bulk-sync", (request: Request, env: Env) => bulkSync(request, env));
router.get("/api/maintenance/:id", (request: Request, env: Env) => getLog(request, env, (request as unknown as { params: { id: string } }).params.id));
router.put("/api/maintenance/:id", (request: Request, env: Env) => updateLog(request, env, (request as unknown as { params: { id: string } }).params.id));
```

**Important:** `/api/maintenance/bulk-sync` must be registered BEFORE `/api/maintenance/:id`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Test maintenance API**

```bash
cd api && npx wrangler dev --local &
sleep 3
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@ohcs.gov.gh","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Create a maintenance log
curl -s -X POST http://localhost:8787/api/maintenance -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"org_entity_id":"unit-council","maintenance_type":"corrective","category_id":"cat-internet","room_number":"24","description":"Restored internet connectivity in Council room","resolution":"Re-terminated ethernet cable at patch panel"}'

# List logs
curl -s http://localhost:8787/api/maintenance -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Bulk sync
curl -s -X POST http://localhost:8787/api/maintenance/bulk-sync -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"logs":[{"org_entity_id":"dir-fa","maintenance_type":"routine","description":"Monthly workstation check","logged_date":"2026-04-01"}]}'

kill %1
```

Expected: Log created with auto-calculated quarter/month/year. Bulk sync returns `synced_count: 1`.

- [ ] **Step 6: Commit**

```bash
git add api/src/
git commit -m "feat: maintenance log CRUD API with bulk-sync and auto quarter calculation"
```

---

## Task 5: Admin Page (Org Entities, Categories, Technicians)

**Files:**
- Create: `web/src/components/admin/OrgEntityManager.tsx`
- Create: `web/src/components/admin/CategoryManager.tsx`
- Create: `web/src/components/admin/TechnicianManager.tsx`
- Create: `web/src/pages/AdminPage.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create OrgEntityManager**

Create `web/src/components/admin/OrgEntityManager.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { Table } from "../ui/Table";
import { Badge } from "../ui/Badge";
import type { OrgEntity } from "../../types";

const TYPE_OPTIONS = [
  { value: "directorate", label: "Directorate" },
  { value: "unit", label: "Unit" },
  { value: "secretariat", label: "Secretariat" },
];

export function OrgEntityManager() {
  const { showToast } = useToast();
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OrgEntity | null>(null);
  const [form, setForm] = useState({ name: "", code: "", type: "directorate", rooms: "" });

  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<OrgEntity[]>("/org-entities");
      setEntities(data);
    } catch {
      showToast("error", "Failed to load entities");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", type: "directorate", rooms: "" });
    setShowForm(true);
  }

  function openEdit(entity: OrgEntity) {
    setEditing(entity);
    setForm({ name: entity.name, code: entity.code, type: entity.type, rooms: entity.rooms.join(", ") });
    setShowForm(true);
  }

  async function handleSubmit() {
    const rooms = form.rooms.split(",").map((r) => r.trim()).filter(Boolean);
    try {
      if (editing) {
        await api.put(`/org-entities/${editing.id}`, { ...form, rooms });
        showToast("success", "Entity updated");
      } else {
        await api.post("/org-entities", { ...form, rooms });
        showToast("success", "Entity created");
      }
      setShowForm(false);
      loadEntities();
    } catch {
      showToast("error", "Failed to save entity");
    }
  }

  async function handleDelete(entity: OrgEntity) {
    if (!confirm(`Deactivate ${entity.name}?`)) return;
    try {
      await api.delete(`/org-entities/${entity.id}`);
      showToast("success", "Entity deactivated");
      loadEntities();
    } catch {
      showToast("error", "Failed to deactivate entity");
    }
  }

  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "type", header: "Type", render: (e: OrgEntity) => <Badge variant={e.type === "directorate" ? "green" : "gray"}>{e.type}</Badge> },
    { key: "rooms", header: "Rooms", render: (e: OrgEntity) => e.rooms.join(", ") || "—" },
    { key: "actions", header: "", render: (e: OrgEntity) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(e)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(e)}>Delete</Button>
      </div>
    )},
  ];

  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Org Entities</h3>
        <Button size="sm" onClick={openCreate}>Add Entity</Button>
      </div>
      <Table columns={columns} data={entities} keyField="id" />
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Entity" : "Add Entity"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Select label="Type" options={TYPE_OPTIONS} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Input label="Rooms (comma-separated)" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} placeholder="e.g. 24, 25" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Create CategoryManager**

Create `web/src/components/admin/CategoryManager.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Table } from "../ui/Table";
import type { MaintenanceCategory } from "../../types";

export function CategoryManager() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<MaintenanceCategory[]>("/categories");
      setCategories(data);
    } catch {
      showToast("error", "Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "" });
    setShowForm(true);
  }

  function openEdit(cat: MaintenanceCategory) {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? "" });
    setShowForm(true);
  }

  async function handleSubmit() {
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
        showToast("success", "Category updated");
      } else {
        await api.post("/categories", form);
        showToast("success", "Category created");
      }
      setShowForm(false);
      loadCategories();
    } catch {
      showToast("error", "Failed to save category");
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description", render: (c: MaintenanceCategory) => c.description ?? "—" },
    { key: "actions", header: "", render: (c: MaintenanceCategory) => (
      <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
    )},
  ];

  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Maintenance Categories</h3>
        <Button size="sm" onClick={openCreate}>Add Category</Button>
      </div>
      <Table columns={columns} data={categories} keyField="id" />
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Create TechnicianManager**

Create `web/src/components/admin/TechnicianManager.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { Table } from "../ui/Table";
import { Badge } from "../ui/Badge";
import type { Technician } from "../../types";

const ROLE_OPTIONS = [
  { value: "technician", label: "Technician" },
  { value: "lead", label: "Lead" },
  { value: "admin", label: "Admin" },
];

export function TechnicianManager() {
  const { showToast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "technician", password: "" });

  const loadTechnicians = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Technician[]>("/technicians");
      setTechnicians(data);
    } catch {
      showToast("error", "Failed to load technicians");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadTechnicians(); }, [loadTechnicians]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", role: "technician", password: "" });
    setShowForm(true);
  }

  function openEdit(tech: Technician) {
    setEditing(tech);
    setForm({ name: tech.name, email: tech.email ?? "", phone: tech.phone ?? "", role: tech.role, password: "" });
    setShowForm(true);
  }

  async function handleSubmit() {
    const payload: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone || null, role: form.role };
    if (form.password) payload.password = form.password;
    if (!editing) {
      if (!form.password) { showToast("error", "Password is required for new technicians"); return; }
      payload.password = form.password;
    }

    try {
      if (editing) {
        await api.put(`/technicians/${editing.id}`, payload);
        showToast("success", "Technician updated");
      } else {
        await api.post("/technicians", payload);
        showToast("success", "Technician created");
      }
      setShowForm(false);
      loadTechnicians();
    } catch {
      showToast("error", "Failed to save technician");
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email", render: (t: Technician) => t.email ?? "—" },
    { key: "role", header: "Role", render: (t: Technician) => <Badge variant={t.role === "admin" ? "red" : t.role === "lead" ? "gold" : "green"}>{t.role}</Badge> },
    { key: "actions", header: "", render: (t: Technician) => (
      <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
    )},
  ];

  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Technicians</h3>
        <Button size="sm" onClick={openCreate}>Add Technician</Button>
      </div>
      <Table columns={columns} data={technicians} keyField="id" />
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Technician" : "Add Technician"}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Role" options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <Input label={editing ? "New Password (leave blank to keep)" : "Password"} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: Create AdminPage with tabs**

Create `web/src/pages/AdminPage.tsx`:

```tsx
import { useState } from "react";
import { Card } from "../components/ui/Card";
import { OrgEntityManager } from "../components/admin/OrgEntityManager";
import { CategoryManager } from "../components/admin/CategoryManager";
import { TechnicianManager } from "../components/admin/TechnicianManager";

const TABS = ["Org Entities", "Categories", "Technicians"] as const;

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Org Entities");

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Admin Panel</h2>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-ghana-green text-ghana-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      <Card>
        {activeTab === "Org Entities" && <OrgEntityManager />}
        {activeTab === "Categories" && <CategoryManager />}
        {activeTab === "Technicians" && <TechnicianManager />}
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Add AdminPage route and ToastProvider to App.tsx**

Update `web/src/App.tsx` to:
1. Import `ToastProvider` from `./context/ToastContext`
2. Import `AdminPage` from `./pages/AdminPage`
3. Wrap `AuthProvider` content with `ToastProvider`
4. Add `<Route path="admin" element={<AdminPage />} />` inside ProtectedRoutes

The full updated `App.tsx`:

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { useAuth } from "./hooks/useAuth";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminPage } from "./pages/AdminPage";

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
        <Route path="admin" element={<AdminPage />} />
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
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add web/src/
git commit -m "feat: admin page with org entity, category, and technician management"
```

---

## Task 6: Equipment Pages (List, Detail, Form, QR Code)

**Files:**
- Create: `web/src/components/equipment/EquipmentList.tsx`
- Create: `web/src/components/equipment/EquipmentForm.tsx`
- Create: `web/src/components/equipment/EquipmentDetail.tsx`
- Create: `web/src/pages/EquipmentPage.tsx`
- Create: `web/src/pages/EquipmentDetailPage.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/package.json`

- [ ] **Step 1: Install qrcode package**

```bash
cd web && npm install qrcode && npm install -D @types/qrcode
```

- [ ] **Step 2: Create EquipmentList component**

Create `web/src/components/equipment/EquipmentList.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Table } from "../ui/Table";
import { Select } from "../ui/Select";
import { StatusPill } from "../ui/StatusPill";
import type { Equipment, OrgEntity } from "../../types";
import { EQUIPMENT_TYPES, EQUIPMENT_STATUSES } from "../../lib/constants";

export function EquipmentList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ org_entity_id: "", status: "", type: "" });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.org_entity_id) params.set("org_entity_id", filters.org_entity_id);
      if (filters.status) params.set("status", filters.status);
      if (filters.type) params.set("type", filters.type);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [eq, ent] = await Promise.all([
        api.get<Equipment[]>(`/equipment${qs}`),
        api.get<OrgEntity[]>("/org-entities"),
      ]);
      setEquipment(eq);
      setEntities(ent);
    } catch {
      showToast("error", "Failed to load equipment");
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));
  const entityOptions = entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }));

  const columns = [
    { key: "asset_tag", header: "Asset Tag" },
    { key: "type", header: "Type", render: (e: Equipment) => EQUIPMENT_TYPES.find((t) => t.value === e.type)?.label ?? e.type },
    { key: "make", header: "Make/Model", render: (e: Equipment) => [e.make, e.model].filter(Boolean).join(" ") || "—" },
    { key: "org_entity_id", header: "Location", render: (e: Equipment) => entityMap[e.org_entity_id]?.code ?? "—" },
    { key: "room_number", header: "Room", render: (e: Equipment) => e.room_number ?? "—" },
    { key: "status", header: "Status", render: (e: Equipment) => <StatusPill status={e.status} /> },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select options={entityOptions} value={filters.org_entity_id} onChange={(e) => setFilters({ ...filters, org_entity_id: e.target.value })} placeholder="All Locations" />
        <Select options={[...EQUIPMENT_TYPES]} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} placeholder="All Types" />
        <Select options={[...EQUIPMENT_STATUSES]} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} placeholder="All Statuses" />
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <Table columns={columns} data={equipment} keyField="id" onRowClick={(e) => navigate(`/equipment/${e.id}`)} emptyMessage="No equipment found" />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create EquipmentForm component**

Create `web/src/components/equipment/EquipmentForm.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import type { Equipment, OrgEntity } from "../../types";
import { EQUIPMENT_TYPES, EQUIPMENT_STATUSES } from "../../lib/constants";

interface EquipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Equipment | null;
}

export function EquipmentForm({ isOpen, onClose, onSaved, editing }: EquipmentFormProps) {
  const { showToast } = useToast();
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [form, setForm] = useState({
    type: "desktop", make: "", model: "", processor: "", serial_number: "",
    org_entity_id: "", room_number: "", status: "active", installed_date: "", notes: "",
  });

  useEffect(() => {
    api.get<OrgEntity[]>("/org-entities").then(setEntities).catch(() => {});
  }, []);

  useEffect(() => {
    if (editing) {
      setForm({
        type: editing.type, make: editing.make ?? "", model: editing.model ?? "",
        processor: editing.processor ?? "", serial_number: editing.serial_number ?? "",
        org_entity_id: editing.org_entity_id, room_number: editing.room_number ?? "",
        status: editing.status, installed_date: editing.installed_date ?? "", notes: editing.notes ?? "",
      });
    } else {
      setForm({ type: "desktop", make: "", model: "", processor: "", serial_number: "", org_entity_id: "", room_number: "", status: "active", installed_date: "", notes: "" });
    }
  }, [editing, isOpen]);

  async function handleSubmit() {
    if (!form.org_entity_id) { showToast("error", "Location is required"); return; }

    const payload = {
      ...form,
      make: form.make || null, model: form.model || null, processor: form.processor || null,
      serial_number: form.serial_number || null, room_number: form.room_number || null,
      installed_date: form.installed_date || null, notes: form.notes || null,
    };

    try {
      if (editing) {
        await api.put(`/equipment/${editing.id}`, payload);
        showToast("success", "Equipment updated");
      } else {
        await api.post("/equipment", payload);
        showToast("success", "Equipment registered");
      }
      onSaved();
      onClose();
    } catch {
      showToast("error", "Failed to save equipment");
    }
  }

  const entityOptions = entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Equipment" : "Register Equipment"} size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Type" options={[...EQUIPMENT_TYPES]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <Input label="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="e.g. HP" />
        <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. ProDesk 400" />
        <Input label="Processor" value={form.processor} onChange={(e) => setForm({ ...form, processor: e.target.value })} placeholder="e.g. Intel Core i5" />
        <Input label="Serial Number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
        <Select label="Location" options={entityOptions} value={form.org_entity_id} onChange={(e) => setForm({ ...form, org_entity_id: e.target.value })} placeholder="Select location" />
        <Input label="Room Number" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
        {editing && <Select label="Status" options={[...EQUIPMENT_STATUSES]} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />}
        <Input label="Installed Date" type="date" value={form.installed_date} onChange={(e) => setForm({ ...form, installed_date: e.target.value })} />
        <div className="sm:col-span-2">
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>{editing ? "Update" : "Register"}</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Create EquipmentDetail component with QR code**

Create `web/src/components/equipment/EquipmentDetail.tsx`:

```tsx
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";
import { Button } from "../ui/Button";
import type { Equipment } from "../../types";

interface EquipmentDetailProps {
  equipment: Equipment;
  entityName: string;
}

export function EquipmentDetail({ equipment, entityName }: EquipmentDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const url = `${window.location.origin}/scan/${equipment.asset_tag}`;
      QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 2 });
    }
  }, [equipment.asset_tag]);

  function downloadQR() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${equipment.asset_tag}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  }

  const details = [
    { label: "Asset Tag", value: equipment.asset_tag },
    { label: "Type", value: equipment.type },
    { label: "Make", value: equipment.make },
    { label: "Model", value: equipment.model },
    { label: "Processor", value: equipment.processor },
    { label: "Serial Number", value: equipment.serial_number },
    { label: "Location", value: entityName },
    { label: "Room", value: equipment.room_number },
    { label: "Installed", value: equipment.installed_date },
  ];

  return (
    <Card>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold">{equipment.asset_tag}</h3>
            <StatusPill status={equipment.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs text-gray-500">{d.label}</dt>
                <dd className="text-sm font-medium text-gray-900">{d.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {equipment.notes && <p className="mt-4 text-sm text-gray-600">{equipment.notes}</p>}
        </div>
        <div className="flex flex-col items-center gap-2">
          <canvas ref={canvasRef} />
          <Button size="sm" variant="secondary" onClick={downloadQR}>Download QR</Button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Create EquipmentPage**

Create `web/src/pages/EquipmentPage.tsx`:

```tsx
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EquipmentList } from "../components/equipment/EquipmentList";
import { EquipmentForm } from "../components/equipment/EquipmentForm";

export function EquipmentPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Equipment Registry</h2>
        <Button onClick={() => setShowForm(true)}>Register Equipment</Button>
      </div>
      <Card padding="sm">
        <EquipmentList key={refreshKey} />
      </Card>
      <EquipmentForm isOpen={showForm} onClose={() => setShowForm(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
```

- [ ] **Step 6: Create EquipmentDetailPage**

Create `web/src/pages/EquipmentDetailPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { StatusPill } from "../components/ui/StatusPill";
import { EquipmentDetail } from "../components/equipment/EquipmentDetail";
import { EquipmentForm } from "../components/equipment/EquipmentForm";
import type { Equipment, MaintenanceLog, OrgEntity } from "../types";
import { MAINTENANCE_TYPES } from "../lib/constants";

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [history, setHistory] = useState<MaintenanceLog[]>([]);
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [data, ent] = await Promise.all([
          api.get<{ equipment: Equipment; maintenance_history: MaintenanceLog[] }>(`/equipment/${id}`),
          api.get<OrgEntity[]>("/org-entities"),
        ]);
        setEquipment(data.equipment);
        setHistory(data.maintenance_history);
        setEntities(ent);
      } catch {
        showToast("error", "Failed to load equipment");
        navigate("/equipment");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, navigate, showToast]);

  if (isLoading || !equipment) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));

  const historyColumns = [
    { key: "logged_date", header: "Date" },
    { key: "maintenance_type", header: "Type", render: (l: MaintenanceLog) => MAINTENANCE_TYPES.find((t) => t.value === l.maintenance_type)?.label ?? l.maintenance_type },
    { key: "description", header: "Description" },
    { key: "status", header: "Status", render: (l: MaintenanceLog) => <StatusPill status={l.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="sm" onClick={() => navigate("/equipment")}>Back</Button>
        <h2 className="text-xl font-bold text-gray-900">Equipment Detail</h2>
        <Button size="sm" onClick={() => setShowEdit(true)}>Edit</Button>
      </div>

      <EquipmentDetail equipment={equipment} entityName={entityMap[equipment.org_entity_id]?.name ?? "Unknown"} />

      <Card padding="sm">
        <h3 className="text-lg font-semibold px-4 py-3">Maintenance History</h3>
        <Table columns={historyColumns} data={history} keyField="id" emptyMessage="No maintenance records" />
      </Card>

      <EquipmentForm
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => window.location.reload()}
        editing={equipment}
      />
    </div>
  );
}
```

- [ ] **Step 7: Add equipment routes to App.tsx**

Update `web/src/App.tsx` to add:

```tsx
import { EquipmentPage } from "./pages/EquipmentPage";
import { EquipmentDetailPage } from "./pages/EquipmentDetailPage";

// Inside ProtectedRoutes, add to <Routes>:
<Route path="equipment" element={<EquipmentPage />} />
<Route path="equipment/:id" element={<EquipmentDetailPage />} />
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add web/
git commit -m "feat: equipment pages — list with filters, detail with QR code, create/edit form"
```

---

## Task 7: Maintenance Log Pages and QR Scanner

**Files:**
- Create: `web/src/components/maintenance/LogForm.tsx`
- Create: `web/src/components/maintenance/LogList.tsx`
- Create: `web/src/components/maintenance/QuickLog.tsx`
- Create: `web/src/components/equipment/QRScanner.tsx`
- Create: `web/src/pages/MaintenancePage.tsx`
- Create: `web/src/pages/ScanPage.tsx`
- Create: `web/src/hooks/useQRScanner.ts`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Install html5-qrcode**

```bash
cd web && npm install html5-qrcode
```

- [ ] **Step 2: Create LogList component**

Create `web/src/components/maintenance/LogList.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Table } from "../ui/Table";
import { Select } from "../ui/Select";
import { StatusPill } from "../ui/StatusPill";
import type { MaintenanceLog, OrgEntity, MaintenanceCategory } from "../../types";
import { MAINTENANCE_TYPES } from "../../lib/constants";

export function LogList() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ year: String(new Date().getFullYear()), quarter: "", maintenance_type: "", org_entity_id: "" });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.year) params.set("year", filters.year);
      if (filters.quarter) params.set("quarter", filters.quarter);
      if (filters.maintenance_type) params.set("maintenance_type", filters.maintenance_type);
      if (filters.org_entity_id) params.set("org_entity_id", filters.org_entity_id);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [logData, entData, catData] = await Promise.all([
        api.get<MaintenanceLog[]>(`/maintenance${qs}`),
        api.get<OrgEntity[]>("/org-entities"),
        api.get<MaintenanceCategory[]>("/categories"),
      ]);
      setLogs(logData);
      setEntities(entData);
      setCategories(catData);
    } catch {
      showToast("error", "Failed to load maintenance logs");
    } finally {
      setIsLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const entityOptions = entities.map((e) => ({ value: e.id, label: e.code }));
  const quarterOptions = [{ value: "1", label: "Q1" }, { value: "2", label: "Q2" }, { value: "3", label: "Q3" }, { value: "4", label: "Q4" }];

  const columns = [
    { key: "logged_date", header: "Date" },
    { key: "maintenance_type", header: "Type", render: (l: MaintenanceLog) => MAINTENANCE_TYPES.find((t) => t.value === l.maintenance_type)?.label ?? l.maintenance_type },
    { key: "category_id", header: "Category", render: (l: MaintenanceLog) => l.category_id ? (categoryMap[l.category_id]?.name ?? "—") : "—" },
    { key: "org_entity_id", header: "Location", render: (l: MaintenanceLog) => entityMap[l.org_entity_id]?.code ?? "—" },
    { key: "room_number", header: "Room", render: (l: MaintenanceLog) => l.room_number ?? "—" },
    { key: "description", header: "Description", render: (l: MaintenanceLog) => l.description.length > 60 ? l.description.slice(0, 60) + "..." : l.description },
    { key: "status", header: "Status", render: (l: MaintenanceLog) => <StatusPill status={l.status} /> },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select options={[{ value: "2026", label: "2026" }, { value: "2025", label: "2025" }]} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} placeholder="All Years" />
        <Select options={quarterOptions} value={filters.quarter} onChange={(e) => setFilters({ ...filters, quarter: e.target.value })} placeholder="All Quarters" />
        <Select options={[...MAINTENANCE_TYPES]} value={filters.maintenance_type} onChange={(e) => setFilters({ ...filters, maintenance_type: e.target.value })} placeholder="All Types" />
        <Select options={entityOptions} value={filters.org_entity_id} onChange={(e) => setFilters({ ...filters, org_entity_id: e.target.value })} placeholder="All Locations" />
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <Table columns={columns} data={logs} keyField="id" emptyMessage="No maintenance logs found" />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create LogForm component**

Create `web/src/components/maintenance/LogForm.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import type { OrgEntity, MaintenanceCategory, Equipment } from "../../types";
import { MAINTENANCE_TYPES } from "../../lib/constants";

interface LogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  prefill?: { equipment_id?: string; org_entity_id?: string; room_number?: string };
}

export function LogForm({ isOpen, onClose, onSaved, prefill }: LogFormProps) {
  const { showToast } = useToast();
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    equipment_id: "", org_entity_id: "", maintenance_type: "routine",
    category_id: "", room_number: "", description: "", resolution: "",
    logged_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    Promise.all([
      api.get<OrgEntity[]>("/org-entities"),
      api.get<MaintenanceCategory[]>("/categories"),
    ]).then(([ent, cat]) => { setEntities(ent); setCategories(cat); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (prefill && isOpen) {
      setForm((f) => ({
        ...f,
        equipment_id: prefill.equipment_id ?? "",
        org_entity_id: prefill.org_entity_id ?? f.org_entity_id,
        room_number: prefill.room_number ?? f.room_number,
      }));
    }
  }, [prefill, isOpen]);

  async function handleSubmit() {
    if (!form.org_entity_id || !form.description) {
      showToast("error", "Location and description are required");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/maintenance", {
        ...form,
        equipment_id: form.equipment_id || null,
        category_id: form.category_id || null,
        room_number: form.room_number || null,
        resolution: form.resolution || null,
      });
      showToast("success", "Maintenance log saved");
      onSaved();
      onClose();
      setForm({ equipment_id: "", org_entity_id: "", maintenance_type: "routine", category_id: "", room_number: "", description: "", resolution: "", logged_date: new Date().toISOString().slice(0, 10) });
    } catch {
      showToast("error", "Failed to save log");
    } finally {
      setIsSaving(false);
    }
  }

  const entityOptions = entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Maintenance Activity" size="lg">
      <div className="space-y-4">
        <Select label="Location" options={entityOptions} value={form.org_entity_id} onChange={(e) => setForm({ ...form, org_entity_id: e.target.value })} placeholder="Select location" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Maintenance Type" options={[...MAINTENANCE_TYPES]} value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} />
          <Select label="Category" options={categoryOptions} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} placeholder="Select category" />
          <Input label="Room Number" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
          <Input label="Date" type="date" value={form.logged_date} onChange={(e) => setForm({ ...form, logged_date: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
            placeholder="Describe the maintenance activity..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
          <textarea
            value={form.resolution}
            onChange={(e) => setForm({ ...form, resolution: e.target.value })}
            rows={2}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
            placeholder="How was it resolved?"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>Save Log</Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Create QRScanner component**

Create `web/src/components/equipment/QRScanner.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface QRScannerProps {
  onScan: (assetTag: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";

  async function startScanning() {
    setError(null);
    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Extract asset tag from URL: .../scan/OHCS-DES-XXXX
          const match = decodedText.match(/\/scan\/([A-Z0-9-]+)$/i);
          if (match?.[1]) {
            scanner.stop().catch(() => {});
            onScan(match[1]);
          }
        },
        () => {} // ignore scan failures
      );
      setIsScanning(true);
    } catch (err) {
      setError("Camera access denied or not available. Please allow camera permissions.");
    }
  }

  function stopScanning() {
    scannerRef.current?.stop().catch(() => {});
    setIsScanning(false);
  }

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <Card>
      <div className="text-center">
        <div id={containerId} className="mx-auto max-w-sm" />
        {!isScanning && (
          <Button onClick={startScanning} className="mt-4">
            Start Scanner
          </Button>
        )}
        {isScanning && (
          <Button variant="secondary" onClick={stopScanning} className="mt-4">
            Stop Scanner
          </Button>
        )}
        {error && <p className="mt-3 text-sm text-ghana-red">{error}</p>}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Create QuickLog component (post-scan form)**

Create `web/src/components/maintenance/QuickLog.tsx`:

```tsx
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";
import { LogForm } from "./LogForm";
import type { Equipment } from "../../types";

interface QuickLogProps {
  equipment: Equipment;
  entityName: string;
  onLogged: () => void;
}

export function QuickLog({ equipment, entityName, onLogged }: QuickLogProps) {
  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <p className="text-sm font-semibold">{equipment.asset_tag}</p>
            <p className="text-xs text-gray-500">{equipment.make} {equipment.model} — {entityName}, Room {equipment.room_number ?? "N/A"}</p>
          </div>
          <StatusPill status={equipment.status} />
        </div>
      </Card>
      <LogForm
        isOpen={true}
        onClose={onLogged}
        onSaved={onLogged}
        prefill={{
          equipment_id: equipment.id,
          org_entity_id: equipment.org_entity_id,
          room_number: equipment.room_number ?? undefined,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Create MaintenancePage**

Create `web/src/pages/MaintenancePage.tsx`:

```tsx
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LogList } from "../components/maintenance/LogList";
import { LogForm } from "../components/maintenance/LogForm";

export function MaintenancePage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Maintenance Logs</h2>
        <Button onClick={() => setShowForm(true)}>Log Activity</Button>
      </div>
      <Card padding="sm">
        <LogList key={refreshKey} />
      </Card>
      <LogForm isOpen={showForm} onClose={() => setShowForm(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
```

- [ ] **Step 7: Create ScanPage**

Create `web/src/pages/ScanPage.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { QRScanner } from "../components/equipment/QRScanner";
import { QuickLog } from "../components/maintenance/QuickLog";
import type { Equipment, OrgEntity } from "../types";

export function ScanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [scannedEquipment, setScannedEquipment] = useState<Equipment | null>(null);
  const [entityName, setEntityName] = useState("");

  async function handleScan(assetTag: string) {
    try {
      const equipment = await api.get<Equipment>(`/equipment/by-tag/${assetTag}`);
      const entities = await api.get<OrgEntity[]>("/org-entities");
      const entity = entities.find((e) => e.id === equipment.org_entity_id);
      setScannedEquipment(equipment);
      setEntityName(entity?.name ?? "Unknown");
    } catch {
      showToast("error", `Equipment not found: ${assetTag}`);
    }
  }

  function handleLogged() {
    showToast("success", "Maintenance logged successfully");
    setScannedEquipment(null);
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Scan Equipment QR Code</h2>
      {scannedEquipment ? (
        <QuickLog equipment={scannedEquipment} entityName={entityName} onLogged={handleLogged} />
      ) : (
        <QRScanner onScan={handleScan} />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Add all new routes to App.tsx**

Update `web/src/App.tsx` ProtectedRoutes to include:

```tsx
import { MaintenancePage } from "./pages/MaintenancePage";
import { ScanPage } from "./pages/ScanPage";

// Inside ProtectedRoutes <Routes>, add:
<Route path="maintenance" element={<MaintenancePage />} />
<Route path="scan" element={<ScanPage />} />
<Route path="scan/:assetTag" element={<ScanPage />} />
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 10: Verify Vite builds**

```bash
cd web && npx vite build
```

- [ ] **Step 11: Commit**

```bash
git add web/
git commit -m "feat: maintenance logging pages, QR scanner, and scan-to-log workflow"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `cd api && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx tsc --noEmit` — zero errors
- [ ] `cd web && npx vite build` — builds successfully
- [ ] Org entity CRUD: list, create, update, delete (soft) via API
- [ ] Equipment CRUD: list with filters, create with auto asset tag, by-tag lookup, detail with QR code
- [ ] Maintenance CRUD: list with filters, create with auto quarter/month/year, bulk-sync
- [ ] Category CRUD: list, create, update via API
- [ ] Technician CRUD: list, create, update via API
- [ ] Admin page shows 3 tabs with functional CRUD for each
- [ ] Equipment page shows filterable list, register form, detail page with QR
- [ ] Maintenance page shows filterable log list, log activity form
- [ ] Scan page opens camera, scans QR, shows QuickLog form pre-filled with equipment details
- [ ] All API endpoints require authentication
- [ ] Admin-only endpoints return 403 for non-admin users
- [ ] Toast notifications show on success/error
