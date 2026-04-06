import { Router } from "itty-router";
import type { Env } from "./types";
import { login, logout, me, register } from "./routes/auth";
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
import {
  listEquipmentHandler,
  getEquipmentHandler,
  getEquipmentByTagHandler,
  createEquipmentHandler,
  updateEquipmentHandler,
  deleteEquipmentHandler,
  bulkImportHandler,
} from "./routes/equipment";
import {
  listLogs,
  getLog,
  createLog,
  updateLog,
  bulkSync,
} from "./routes/maintenance";
import { readinessReport, agingReport } from "./routes/equipment-analytics";
import { dashboardSummary, dashboardTrends, entityDetail, workload } from "./routes/dashboard";
import { listAuditLog } from "./routes/audit";
import { search } from "./routes/search";
import { uploadFile } from "./routes/upload";
import { listSchedules, todaySchedule, createSchedule, updateSchedule, deleteSchedule } from "./routes/schedules";
import {
  listReports,
  getReport,
  previewReport,
  generateReport,
  downloadReport,
} from "./routes/reports";

const router = Router();

// Health check
router.get("/api/health", () => {
  return new Response(JSON.stringify({ status: "ok", service: "rsimd-items-api" }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Auth
router.post("/api/auth/login", (request: Request, env: Env) => login(request, env));
router.post("/api/auth/register", (request: Request, env: Env) => register(request, env));
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

// Equipment (by-tag MUST be before :id to match first)
router.get("/api/equipment/by-tag/:assetTag", (request: Request, env: Env) => {
  const assetTag = (request as unknown as { params: { assetTag: string } }).params.assetTag;
  return getEquipmentByTagHandler(request, env, assetTag);
});
router.post("/api/equipment/bulk-import", (request: Request, env: Env) => bulkImportHandler(request, env));
router.get("/api/equipment/readiness", (request: Request, env: Env) => readinessReport(request, env));
router.get("/api/equipment/aging", (request: Request, env: Env) => agingReport(request, env));
router.get("/api/equipment", (request: Request, env: Env) => listEquipmentHandler(request, env));
router.get("/api/equipment/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return getEquipmentHandler(request, env, id);
});
router.post("/api/equipment", (request: Request, env: Env) => createEquipmentHandler(request, env));
router.put("/api/equipment/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return updateEquipmentHandler(request, env, id);
});
router.delete("/api/equipment/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return deleteEquipmentHandler(request, env, id);
});

// Maintenance Logs (bulk-sync MUST be before :id)
router.get("/api/maintenance", (request: Request, env: Env) => listLogs(request, env));
router.post("/api/maintenance/bulk-sync", (request: Request, env: Env) => bulkSync(request, env));
router.post("/api/maintenance", (request: Request, env: Env) => createLog(request, env));
router.get("/api/maintenance/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return getLog(request, env, id);
});
router.put("/api/maintenance/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return updateLog(request, env, id);
});

// Dashboard
router.get("/api/dashboard/summary", (request: Request, env: Env) => dashboardSummary(request, env));
router.get("/api/dashboard/trends", (request: Request, env: Env) => dashboardTrends(request, env));
router.get("/api/dashboard/workload", (request: Request, env: Env) => workload(request, env));
router.get("/api/dashboard/entity/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return entityDetail(request, env, id);
});

// Reports (generate and download MUST be before :id)
router.get("/api/reports", (request: Request, env: Env) => listReports(request, env));
router.post("/api/reports/preview", (request: Request, env: Env) => previewReport(request, env));
router.post("/api/reports/generate", (request: Request, env: Env) => generateReport(request, env));
router.get("/api/reports/:id/download", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return downloadReport(request, env, id);
});
router.get("/api/reports/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return getReport(request, env, id);
});

// Audit Log
router.get("/api/audit-log", (request: Request, env: Env) => listAuditLog(request, env));

// Search
router.get("/api/search", (request: Request, env: Env) => search(request, env));

// Upload
router.post("/api/upload", (request: Request, env: Env) => uploadFile(request, env));

// Schedules
router.get("/api/schedules/today", (request: Request, env: Env) => todaySchedule(request, env));
router.get("/api/schedules", (request: Request, env: Env) => listSchedules(request, env));
router.post("/api/schedules", (request: Request, env: Env) => createSchedule(request, env));
router.put("/api/schedules/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return updateSchedule(request, env, id);
});
router.delete("/api/schedules/:id", (request: Request, env: Env) => {
  const id = (request as unknown as { params: { id: string } }).params.id;
  return deleteSchedule(request, env, id);
});

// 404 catch-all
router.all("*", () => {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});

export { router };
