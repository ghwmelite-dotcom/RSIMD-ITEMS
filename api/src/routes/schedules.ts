import type { Env, AuthSession } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";

interface ScheduleRow {
  id: string;
  date: string;
  org_entity_id: string;
  rooms: string;
  assigned_technicians: string;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function formatSchedule(row: ScheduleRow, entityName?: string, entityCode?: string, techNames?: string[]) {
  return {
    id: row.id,
    date: row.date,
    org_entity_id: row.org_entity_id,
    entity_name: entityName ?? null,
    entity_code: entityCode ?? null,
    rooms: JSON.parse(row.rooms),
    assigned_technicians: JSON.parse(row.assigned_technicians),
    technician_names: techNames ?? [],
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
  };
}

// GET /api/schedules?date=2026-04-07 or ?week=2026-04-07 (returns Mon-Fri)
export async function listSchedules(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const week = url.searchParams.get("week");

  let rows: ScheduleRow[];

  if (date) {
    const result = await env.DB.prepare(
      "SELECT * FROM schedules WHERE date = ? ORDER BY created_at"
    ).bind(date).all<ScheduleRow>();
    rows = result.results;
  } else if (week) {
    // Get Monday of the week
    const d = new Date(week);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const monStr = monday.toISOString().slice(0, 10);
    const friStr = friday.toISOString().slice(0, 10);

    const result = await env.DB.prepare(
      "SELECT * FROM schedules WHERE date >= ? AND date <= ? ORDER BY date, created_at"
    ).bind(monStr, friStr).all<ScheduleRow>();
    rows = result.results;
  } else {
    // Default: this week
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const monStr = monday.toISOString().slice(0, 10);
    const friStr = friday.toISOString().slice(0, 10);

    const result = await env.DB.prepare(
      "SELECT * FROM schedules WHERE date >= ? AND date <= ? ORDER BY date, created_at"
    ).bind(monStr, friStr).all<ScheduleRow>();
    rows = result.results;
  }

  // Resolve entity names and technician names
  const entityIds = [...new Set(rows.map((r) => r.org_entity_id))];
  const techIds = [...new Set(rows.flatMap((r) => JSON.parse(r.assigned_technicians) as string[]))];

  const entities = entityIds.length > 0
    ? await env.DB.prepare(`SELECT id, name, code FROM org_entities WHERE id IN (${entityIds.map(() => "?").join(",")})`)
        .bind(...entityIds).all<{ id: string; name: string; code: string }>()
    : { results: [] };

  const techs = techIds.length > 0
    ? await env.DB.prepare(`SELECT id, name FROM technicians WHERE id IN (${techIds.map(() => "?").join(",")})`)
        .bind(...techIds).all<{ id: string; name: string }>()
    : { results: [] };

  const entityMap = new Map(entities.results.map((e) => [e.id, e]));
  const techMap = new Map(techs.results.map((t) => [t.id, t.name]));

  const formatted = rows.map((row) => {
    const entity = entityMap.get(row.org_entity_id);
    const assignedIds = JSON.parse(row.assigned_technicians) as string[];
    const techNames = assignedIds.map((id) => techMap.get(id) ?? "Unknown");
    return formatSchedule(row, entity?.name, entity?.code, techNames);
  });

  return jsonResponse(formatted, 200, request);
}

// GET /api/schedules/today
export async function todaySchedule(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const today = new Date().toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    "SELECT * FROM schedules WHERE date = ? ORDER BY created_at"
  ).bind(today).all<ScheduleRow>();

  const rows = result.results;

  // Resolve names
  const entityIds = [...new Set(rows.map((r) => r.org_entity_id))];
  const techIds = [...new Set(rows.flatMap((r) => JSON.parse(r.assigned_technicians) as string[]))];

  const entities = entityIds.length > 0
    ? await env.DB.prepare(`SELECT id, name, code FROM org_entities WHERE id IN (${entityIds.map(() => "?").join(",")})`)
        .bind(...entityIds).all<{ id: string; name: string; code: string }>()
    : { results: [] };

  const techs = techIds.length > 0
    ? await env.DB.prepare(`SELECT id, name FROM technicians WHERE id IN (${techIds.map(() => "?").join(",")})`)
        .bind(...techIds).all<{ id: string; name: string }>()
    : { results: [] };

  const entityMap = new Map(entities.results.map((e) => [e.id, e]));
  const techMap = new Map(techs.results.map((t) => [t.id, t.name]));

  const formatted = rows.map((row) => {
    const entity = entityMap.get(row.org_entity_id);
    const assignedIds = JSON.parse(row.assigned_technicians) as string[];
    const techNames = assignedIds.map((id) => techMap.get(id) ?? "Unknown");
    return formatSchedule(row, entity?.name, entity?.code, techNames);
  });

  return jsonResponse(formatted, 200, request);
}

// POST /api/schedules
export async function createSchedule(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "lead", "admin");
  if (roleError) return roleError;

  let body: { date: string; org_entity_id: string; rooms?: string[]; assigned_technicians?: string[]; notes?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  if (!body.date || !body.org_entity_id) {
    return errorResponse("date and org_entity_id are required", 400, request);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO schedules (id, date, org_entity_id, rooms, assigned_technicians, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id, body.date, body.org_entity_id,
    JSON.stringify(body.rooms ?? []),
    JSON.stringify(body.assigned_technicians ?? []),
    body.notes ?? null,
    sessionOrError.technician_id
  ).run();

  return jsonResponse({ id, date: body.date, org_entity_id: body.org_entity_id, status: "scheduled" }, 201, request);
}

// PUT /api/schedules/:id
export async function updateSchedule(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "lead", "admin");
  if (roleError) return roleError;

  let body: { rooms?: string[]; assigned_technicians?: string[]; notes?: string; status?: string };
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400, request); }

  const existing = await env.DB.prepare("SELECT * FROM schedules WHERE id = ?").bind(id).first<ScheduleRow>();
  if (!existing) return errorResponse("Schedule not found", 404, request);

  await env.DB.prepare(
    "UPDATE schedules SET rooms = ?, assigned_technicians = ?, notes = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(
    body.rooms ? JSON.stringify(body.rooms) : existing.rooms,
    body.assigned_technicians ? JSON.stringify(body.assigned_technicians) : existing.assigned_technicians,
    body.notes !== undefined ? body.notes : existing.notes,
    body.status ?? existing.status,
    id
  ).run();

  return jsonResponse({ success: true }, 200, request);
}

// DELETE /api/schedules/:id
export async function deleteSchedule(request: Request, env: Env, id: string): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "lead", "admin");
  if (roleError) return roleError;

  await env.DB.prepare("DELETE FROM schedules WHERE id = ?").bind(id).run();
  return jsonResponse({ success: true }, 200, request);
}
