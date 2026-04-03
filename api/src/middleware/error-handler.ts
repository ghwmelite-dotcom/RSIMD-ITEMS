import { corsHeaders } from "./cors";

export function jsonResponse(data: unknown, status = 200, request?: Request): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (request) {
    Object.assign(headers, corsHeaders(request));
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(error: string, status = 500, request?: Request, details?: unknown): Response {
  return jsonResponse({ error, details }, status, request);
}

export function handleError(err: unknown, request: Request): Response {
  console.error("Unhandled error:", err);

  const message = err instanceof Error ? err.message : "Internal server error";
  return errorResponse(message, 500, request);
}
