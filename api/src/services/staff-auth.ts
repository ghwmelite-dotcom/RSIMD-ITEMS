import { compare } from "bcryptjs";
import type { Env, TechnicianRow, AuthSession } from "../types";
import { sha256 } from "./team-form";

export const normalizeStaffId = (value: string) => value.trim().toUpperCase();
export const validStaffId = (value: string) => /^[A-Z0-9][A-Z0-9/-]{1,39}$/.test(value);
export const validPin = (value: unknown): value is string => typeof value === "string" && /^\d{4,6}$/.test(value);
export function temporaryPin(staffId: string): string {
  const digits = staffId.replace(/\D/g, "");
  if (digits.length < 4) throw new Error("Staff ID must contain at least four digits for the initial PIN");
  return digits.slice(-4);
}
const hex = (data: Uint8Array) => Array.from(data, x => x.toString(16).padStart(2, "0")).join("");
export async function hashPin(pin: string, salt = crypto.getRandomValues(new Uint8Array(16))): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt).buffer, iterations: 100_000 }, key, 256);
  return `pbkdf2$100000$${hex(salt)}$${hex(new Uint8Array(bits))}`;
}
export async function verifyPin(pin: string, encoded: string): Promise<boolean> {
  if (encoded.startsWith("$2")) return compare(pin, encoded);
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2" || parts[1] !== "100000" || !/^[a-f0-9]{32}$/.test(parts[2]!) || !/^[a-f0-9]{64}$/.test(parts[3]!)) return false;
  const salt = Uint8Array.from(parts[2]!.match(/../g)!, x => parseInt(x, 16));
  const actual = await hashPin(pin, salt);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ encoded.charCodeAt(i);
  return difference === 0;
}
export function publicStaff(row: TechnicianRow) {
  let entities: string[] = [];
  try { entities = JSON.parse(row.assigned_entities); } catch { /* empty */ }
  return { id: row.id, name: row.name, role: row.role, email: row.email, phone: row.phone, staff_id: row.staff_id,
    staff_category: row.staff_category, must_change_pin: Boolean(row.must_change_pin), is_active: Boolean(row.is_active), assigned_entities: entities };
}
export async function issueSession(env: Env, row: TechnicianRow) {
  const token = `ritems_${crypto.randomUUID().replace(/-/g, "")}`;
  const session: AuthSession = { technician_id: row.id, role: row.role, name: row.name, session_version: row.session_version, created_at: new Date().toISOString() };
  await env.KV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 86400 });
  return { token, technician: publicStaff(row) };
}
// Atomic fixed windows in D1: concurrent attempts cannot bypass the counter.
export async function allowAttempt(env: Env, identity: string, limit: number): Promise<boolean> {
  const key = await sha256(identity), now = Date.now(), window = 15 * 60 * 1000;
  const result = await env.DB.prepare(`INSERT INTO auth_login_limits (limit_key, attempts, window_start) VALUES (?, 1, ?)
    ON CONFLICT(limit_key) DO UPDATE SET attempts = CASE WHEN window_start <= ? THEN 1 ELSE attempts + 1 END,
    window_start = CASE WHEN window_start <= ? THEN ? ELSE window_start END RETURNING attempts`)
    .bind(key, now, now - window, now - window, now).first<{ attempts: number }>();
  return Boolean(result && result.attempts <= limit);
}
export async function jsonObject(request: Request, max = 100_000): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  if (reader) while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > max) { await reader.cancel(); throw new Error("Request is too large"); } chunks.push(item.value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("A JSON object is required");
  return value as Record<string, unknown>;
}
