import type { Env, TechnicianRow } from "../types";
import { authenticate, requireRole } from "../middleware/auth";
import { errorResponse, jsonResponse } from "../middleware/error-handler";
import { hashPin, jsonObject, temporaryPin } from "../services/staff-auth";
import { staffInput, type StaffInput } from "../services/staff-input";

export async function importStaff(request: Request, env: Env, commit: boolean): Promise<Response> {
  const session = await authenticate(request, env); if (session instanceof Response) return session;
  const denied = requireRole(session, request, "admin"); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await jsonObject(request); } catch { return errorResponse("Invalid or oversized staff file", 400, request); }
  if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 50) return errorResponse("Upload 1–50 staff rows", 400, request);
  const errors: { row: number; message: string }[] = [], rows: (StaffInput & { status: "new" | "existing" })[] = [];
  const ids = new Set<string>(), emails = new Set<string>();
  for (const [i, value] of body.rows.entries()) {
    try {
      const row = staffInput(value);
      if (ids.has(row.staff_id) || (row.email && emails.has(row.email))) throw new Error("Duplicate Staff ID or email in this file");
      ids.add(row.staff_id); if (row.email) emails.add(row.email);
      const existing = await env.DB.prepare("SELECT * FROM technicians WHERE staff_id = ?").bind(row.staff_id).first<TechnicianRow>();
      if (existing && (!existing.is_active || existing.name.toLowerCase() !== row.name.toLowerCase() || existing.role !== row.role || existing.staff_category !== row.staff_category || (existing.email ?? "").toLowerCase() !== row.email || (existing.phone ?? "") !== row.phone)) throw new Error("Staff ID already belongs to an account with different details. Edit that account individually.");
      if (row.email) {
        const owner = await env.DB.prepare("SELECT id FROM technicians WHERE lower(email) = ? AND (staff_id IS NULL OR staff_id <> ?)").bind(row.email, row.staff_id).first();
        if (owner) throw new Error("Email belongs to an existing account. Add its Staff ID using Edit instead of creating a duplicate.");
      }
      rows.push({ ...row, status: existing ? "existing" : "new" });
    } catch (error) { errors.push({ row: i + 2, message: error instanceof Error ? error.message : "Invalid row" }); }
  }
  if (errors.length) return jsonResponse({ valid: false, rows, errors }, commit ? 400 : 200, request);
  const fresh = rows.filter(row => row.status === "new");
  if (!commit) return jsonResponse({ valid: true, rows, errors: [], new_count: fresh.length, existing_count: rows.length - fresh.length }, 200, request);
  const credentials: { staff_id: string; name: string; temporary_pin: string }[] = [];
  const statements: D1PreparedStatement[] = [];
  for (const row of fresh) {
    const pin = temporaryPin(row.staff_id), encoded = await hashPin(pin), id = `staff-${crypto.randomUUID()}`;
    statements.push(env.DB.prepare("INSERT INTO technicians (id, staff_id, name, staff_category, role, email, phone, password_hash, must_change_pin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(id, row.staff_id, row.name, row.staff_category, row.role, row.email || null, row.phone || null, encoded));
    credentials.push({ staff_id: row.staff_id, name: row.name, temporary_pin: pin });
  }
  if (statements.length) {
    statements.push(env.DB.prepare("INSERT INTO audit_log (id, actor_id, actor_name, action, resource_type, details) VALUES (?, ?, ?, 'create', 'staff_import', ?)")
      .bind(crypto.randomUUID(), session.technician_id, session.name, `Created ${fresh.length} staff accounts; credentials omitted`));
    try { await env.DB.batch(statements); }
    catch (error) { if (String(error).includes("UNIQUE")) return errorResponse("An account was added during import. No rows from this request were saved. Preview again.", 409, request); throw error; }
  }
  const response = jsonResponse({ valid: true, created: fresh.length, skipped: rows.length - fresh.length, credentials, errors: [] }, 201, request);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
