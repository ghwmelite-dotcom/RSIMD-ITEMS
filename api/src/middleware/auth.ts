import type { Env, AuthSession } from "../types";
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

  return JSON.parse(sessionJson) as AuthSession;
}

export function requireRole(session: AuthSession, ...roles: AuthSession["role"][]): Response | null {
  if (!roles.includes(session.role)) {
    return new Response(
      JSON.stringify({ error: `Requires role: ${roles.join(" or ")}` }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return null;
}
