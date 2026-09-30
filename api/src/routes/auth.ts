import type { Env, TechnicianRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { getTechnicianById } from "../db/queries";
import { normalizeStaffId, validStaffId, validPin, verifyPin, hashPin, issueSession, publicStaff, allowAttempt, jsonObject } from "../services/staff-auth";

export async function login(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await jsonObject(request, 4096); } catch { return errorResponse("Invalid login request", 400, request); }
  const raw = body.staff_id ?? body.email;
  const pin = body.pin ?? body.password;
  if (typeof raw !== "string" || raw.length > 150 || !validPin(pin)) return errorResponse("Staff ID and a 4–6 digit PIN are required", 400, request);
  const identifier = raw.trim();
  const legacy = typeof body.email === "string" && !body.staff_id;
  if (!legacy && !validStaffId(normalizeStaffId(identifier))) return errorResponse("Enter a valid Staff ID", 400, request);
  if (!await allowAttempt(env, `login-ip:${request.headers.get("CF-Connecting-IP") ?? "local"}`, 50) ||
      !await allowAttempt(env, `login-id:${identifier.toUpperCase()}`, 10)) return errorResponse("Too many sign-in attempts. Try again in 15 minutes.", 429, request);
  const row = legacy
    ? await env.DB.prepare("SELECT * FROM technicians WHERE lower(email) = ? AND staff_id IS NULL AND is_active = 1").bind(identifier.toLowerCase()).first<TechnicianRow>()
    : await env.DB.prepare("SELECT * FROM technicians WHERE staff_id = ? AND is_active = 1").bind(normalizeStaffId(identifier)).first<TechnicianRow>();
  // Perform comparable work for absent accounts without exposing account existence.
  const ok = row ? await verifyPin(pin, row.password_hash) : (await hashPin(pin), false);
  if (!row || !ok) return errorResponse("Invalid Staff ID or PIN (existing accounts may use email until assigned a Staff ID)", 401, request);
  return jsonResponse(await issueSession(env, row), 200, request);
}
export async function register(request: Request): Promise<Response> {
  return errorResponse("Ask your ITEMS administrator to create your staff account", 403, request);
}
export async function logout(request: Request, env: Env): Promise<Response> {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ritems_")) await env.KV.delete(`session:${header.slice(7)}`);
  return jsonResponse({ success: true }, 200, request);
}
export async function me(request: Request, env: Env): Promise<Response> {
  const session = await authenticate(request, env); if (session instanceof Response) return session;
  const row = await getTechnicianById(env.DB, session.technician_id);
  if (!row) return errorResponse("Account unavailable", 401, request);
  return jsonResponse(publicStaff(row), 200, request);
}
export async function changePin(request: Request, env: Env): Promise<Response> {
  const session = await authenticate(request, env); if (session instanceof Response) return session;
  let body: Record<string, unknown>;
  try { body = await jsonObject(request, 4096); } catch { return errorResponse("Invalid PIN change request", 400, request); }
  if (!validPin(body.current_pin) || !validPin(body.new_pin) || body.current_pin === body.new_pin) return errorResponse("Enter your current PIN and a different new 4–6 digit PIN", 400, request);
  if (!await allowAttempt(env, `change-pin:${session.technician_id}`, 10)) return errorResponse("Too many attempts. Try again in 15 minutes.", 429, request);
  const row = await getTechnicianById(env.DB, session.technician_id);
  if (!row || !await verifyPin(body.current_pin, row.password_hash)) return errorResponse("Current PIN is incorrect", 400, request);
  const passwordHash = await hashPin(body.new_pin);
  const updated = await env.DB.prepare("UPDATE technicians SET password_hash = ?, must_change_pin = 0, session_version = session_version + 1, updated_at = datetime('now') WHERE id = ? AND password_hash = ? AND session_version = ? RETURNING *")
    .bind(passwordHash, row.id, row.password_hash, row.session_version).first<TechnicianRow>();
  if (!updated) return errorResponse("Account changed. Sign in again.", 409, request);
  return jsonResponse(await issueSession(env, updated), 200, request);
}

export async function keepPin(request: Request, env: Env): Promise<Response> {
  const session = await authenticate(request, env); if (session instanceof Response) return session;
  let body: Record<string, unknown>;
  try { body = await jsonObject(request, 4096); } catch { return errorResponse("Invalid PIN preference", 400, request); }
  if (!validPin(body.current_pin)) return errorResponse("Enter your current PIN to confirm", 400, request);
  if (!await allowAttempt(env, `change-pin:${session.technician_id}`, 10)) return errorResponse("Too many attempts. Try again in 15 minutes.", 429, request);
  const row = await getTechnicianById(env.DB, session.technician_id);
  if (!row || !await verifyPin(body.current_pin, row.password_hash)) return errorResponse("Current PIN is incorrect", 400, request);
  const updated = await env.DB.prepare("UPDATE technicians SET must_change_pin=0, session_version=session_version+1, updated_at=datetime('now') WHERE id=? AND password_hash=? AND session_version=? RETURNING *")
    .bind(row.id, row.password_hash, row.session_version).first<TechnicianRow>();
  if (!updated) return errorResponse("Account changed. Sign in again.", 409, request);
  return jsonResponse(await issueSession(env, updated), 200, request);
}
