import type { Env, TechnicianRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { listTechnicians } from "../db/queries";
import { hashPin, temporaryPin, publicStaff, jsonObject } from "../services/staff-auth";
import { staffInput } from "../services/staff-input";

export async function getTechnicians(request: Request, env: Env): Promise<Response> {
  const session = await authenticate(request, env); if (session instanceof Response) return session;
  const rows = await listTechnicians(env.DB);
  return jsonResponse(rows.filter(row => session.role === "admin" || row.is_active).map(row => session.role === "admin" ? publicStaff(row) : { id: row.id, name: row.name, role: row.role, staff_category: row.staff_category, assigned_entities: publicStaff(row).assigned_entities }), 200, request);
}
export async function getTechnician(request: Request, env: Env, id: string): Promise<Response> {
  const session = await authenticate(request, env); if (session instanceof Response) return session;
  if (session.role !== "admin" && session.technician_id !== id) return errorResponse("Administrator access required", 403, request);
  const row = await env.DB.prepare("SELECT * FROM technicians WHERE id = ?").bind(id).first<TechnicianRow>();
  return row ? jsonResponse(publicStaff(row), 200, request) : errorResponse("Staff account not found", 404, request);
}
export async function createTechnician(request: Request, env: Env): Promise<Response> { return saveStaff(request, env); }
export async function updateTechnician(request: Request, env: Env, id: string): Promise<Response> { return saveStaff(request, env, id); }
async function saveStaff(request: Request, env: Env, id?: string): Promise<Response> {
  const session = await authenticate(request, env); if (session instanceof Response) return session;
  const denied = requireRole(session, request, "admin"); if (denied) return denied;
  const existing = id ? await env.DB.prepare("SELECT * FROM technicians WHERE id = ?").bind(id).first<TechnicianRow>() : null;
  if (id && !existing) return errorResponse("Staff account not found", 404, request);
  let body: Record<string, unknown>;
  try { body = await jsonObject(request, 8192); } catch { return errorResponse("Invalid staff request", 400, request); }
  let row;
  try { row = staffInput({ ...existing, ...body }, true); } catch (error) { return errorResponse(error instanceof Error ? error.message : "Invalid staff details", 400, request); }
  if (body.is_active !== undefined && typeof body.is_active !== "boolean") return errorResponse("Active status must be true or false", 400, request);
  const active = body.is_active === undefined ? existing?.is_active ?? 1 : Number(body.is_active);
  if (id === session.technician_id && (!active || row.role !== "admin")) return errorResponse("You cannot disable or remove your own administrator access", 400, request);
  if (body.reset_pin !== undefined && typeof body.reset_pin !== "boolean") return errorResponse("Invalid PIN reset request", 400, request);
  const pin = !existing || body.reset_pin === true ? temporaryPin(row.staff_id) : undefined;
  if (row.email) {
    const other = await env.DB.prepare("SELECT id FROM technicians WHERE lower(email) = ? AND id <> ?").bind(row.email, id ?? "").first();
    if (other) return errorResponse("Email already belongs to another account", 409, request);
  }
  const staffKey = id ?? `staff-${crypto.randomUUID()}`;
  const encoded = pin ? await hashPin(pin) : existing!.password_hash;
  const version = (existing?.session_version ?? 0) + (existing && (pin || row.role !== existing.role || active !== existing.is_active || row.staff_id !== existing.staff_id) ? 1 : 0);
  const mustChange = pin ? 1 : existing?.must_change_pin ?? 0;
  try {
    const write = existing ? env.DB.prepare("UPDATE technicians SET staff_id=?, name=?, staff_category=?, role=?, email=?, phone=?, password_hash=?, is_active=?, must_change_pin=?, session_version=?, updated_at=datetime('now') WHERE id=?")
      .bind(row.staff_id, row.name, row.staff_category, row.role, row.email || null, row.phone || null, encoded, active, mustChange, version, staffKey)
      : env.DB.prepare("INSERT INTO technicians (id,staff_id,name,staff_category,role,email,phone,password_hash,is_active,must_change_pin,session_version) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(staffKey, row.staff_id, row.name, row.staff_category, row.role, row.email || null, row.phone || null, encoded, active, mustChange, version);
    await env.DB.batch([write, env.DB.prepare("INSERT INTO audit_log (id,actor_id,actor_name,action,resource_type,resource_id,details) VALUES (?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), session.technician_id, session.name, existing ? "update" : "create", "staff", staffKey, pin ? "Account saved; temporary PIN issued (value omitted)" : "Account details updated")]);
  } catch (error) { if (String(error).includes("UNIQUE")) return errorResponse("Staff ID already exists", 409, request); throw error; }
  const updated = await env.DB.prepare("SELECT * FROM technicians WHERE id = ?").bind(staffKey).first<TechnicianRow>();
  const response = jsonResponse({ ...publicStaff(updated!), ...(pin ? { temporary_pin: pin } : {}) }, existing ? 200 : 201, request);
  response.headers.set("Cache-Control", "no-store"); return response;
}
