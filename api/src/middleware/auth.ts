import type { Env, AuthSession, TechnicianRow } from "../types";
import { errorResponse } from "./error-handler";

export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthSession | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ritems_")) {
    return errorResponse("Missing or invalid authorization token", 401, request);
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  const sessionJson = await env.KV.get(`session:${token}`);
  if (!sessionJson) {
    return errorResponse("Token expired or invalid", 401, request);
  }

  let session: AuthSession;
  try { session = JSON.parse(sessionJson) as AuthSession; } catch { return errorResponse("Invalid session", 401, request); }
  const row = await env.DB.prepare("SELECT * FROM technicians WHERE id = ?").bind(session.technician_id).first<TechnicianRow>();
  if (!row || !row.is_active) return errorResponse("Account is inactive", 403, request);
  if ((session.session_version ?? 0) !== (row.session_version ?? 0)) return errorResponse("Session expired. Sign in again.", 401, request);
  const path = new URL(request.url).pathname;
  if (row.must_change_pin && !["/api/auth/me", "/api/auth/change-pin", "/api/auth/keep-pin", "/api/auth/logout"].includes(path)) return errorResponse("Choose whether to keep or change your initial PIN before continuing", 403, request);
  return { ...session, name: row.name, role: row.role };
}

export function requireRole(session: AuthSession, request: Request, ...roles: AuthSession["role"][]): Response | null {
  if (!roles.includes(session.role)) {
    return errorResponse(`Requires role: ${roles.join(" or ")}`, 403, request);
  }
  return null;
}
