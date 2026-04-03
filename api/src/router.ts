import { Router } from "itty-router";
import type { Env } from "./types";
import { login, logout, me } from "./routes/auth";

const router = Router();

// Health check
router.get("/api/health", () => {
  return new Response(JSON.stringify({ status: "ok", service: "rsimd-items-api" }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Auth
router.post("/api/auth/login", (request: Request, env: Env) => login(request, env));
router.post("/api/auth/logout", (request: Request, env: Env) => logout(request, env));
router.get("/api/auth/me", (request: Request, env: Env) => me(request, env));

// 404 catch-all
router.all("*", () => {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});

export { router };
