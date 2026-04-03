export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: "ok", service: "rsimd-items-api" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
