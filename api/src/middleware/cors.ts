const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://rsimd-items.pages.dev",
];

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  // Allow localhost, *.pages.dev, and *.workers.dev origins
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".pages.dev") ||
    origin.endsWith(".workers.dev");
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0]!;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCorsPrelight(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return null;
}
