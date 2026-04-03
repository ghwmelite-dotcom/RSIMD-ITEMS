import { Router } from "itty-router";
import type { Env } from "./types";
import { login, logout, me } from "./routes/auth";
import {
  listEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
} from "./routes/org-entities";
import {
  getCategories,
  createCategory,
  updateCategory,
} from "./routes/categories";
import {
  getTechnicians,
  getTechnician,
  createTechnician,
  updateTechnician,
} from "./routes/technicians";

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

// Org Entities
router.get("/api/org-entities", (request: Request, env: Env) => listEntities(request, env));
router.get("/api/org-entities/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return getEntity(request, env, id);
});
router.post("/api/org-entities", (request: Request, env: Env) => createEntity(request, env));
router.put("/api/org-entities/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return updateEntity(request, env, id);
});
router.delete("/api/org-entities/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return deleteEntity(request, env, id);
});

// Categories
router.get("/api/categories", (request: Request, env: Env) => getCategories(request, env));
router.post("/api/categories", (request: Request, env: Env) => createCategory(request, env));
router.put("/api/categories/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return updateCategory(request, env, id);
});

// Technicians
router.get("/api/technicians", (request: Request, env: Env) => getTechnicians(request, env));
router.get("/api/technicians/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return getTechnician(request, env, id);
});
router.post("/api/technicians", (request: Request, env: Env) => createTechnician(request, env));
router.put("/api/technicians/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return updateTechnician(request, env, id);
});

// 404 catch-all
router.all("*", () => {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});

export { router };
