import { router } from "./router";
import { handleCorsPrelight, corsHeaders } from "./middleware/cors";
import { handleError } from "./middleware/error-handler";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const preflightResponse = handleCorsPrelight(request);
    if (preflightResponse) return preflightResponse;

    try {
      const response = await router.fetch(request, env);

      // Add CORS headers to all responses
      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request))) {
        newHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return handleError(err, request);
    }
  },
};
