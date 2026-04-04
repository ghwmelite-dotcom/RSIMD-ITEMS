import type { Env } from "../types";
import { jsonResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";

export async function listAuditLog(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const result = await env.DB.prepare(
    "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?"
  )
    .bind(limit, offset)
    .all();

  return jsonResponse(result.results, 200, request);
}
