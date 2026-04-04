import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import {
  getDashboardSummary,
  getYearlyTrends,
  getPreviousQuarterSummary,
  detectAnomalies,
  getEntityDetail,
  getTechnicianWorkload,
} from "../services/aggregator";

export async function dashboardSummary(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const now = new Date();
  const year = url.searchParams.get("year")
    ? parseInt(url.searchParams.get("year")!, 10)
    : now.getFullYear();
  const quarter = url.searchParams.get("quarter")
    ? parseInt(url.searchParams.get("quarter")!, 10)
    : Math.ceil((now.getMonth() + 1) / 3);

  if (isNaN(year) || isNaN(quarter) || quarter < 1 || quarter > 4) {
    return errorResponse("Invalid year or quarter parameter", 400, request);
  }

  try {
    const [summary, previous, alerts] = await Promise.all([
      getDashboardSummary(env.DB, year, quarter),
      getPreviousQuarterSummary(env.DB, year, quarter),
      detectAnomalies(env.DB, year, quarter),
    ]);
    return jsonResponse({ ...summary, previous, alerts }, 200, request);
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return errorResponse("Failed to load dashboard summary", 500, request);
  }
}

export async function dashboardTrends(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const now = new Date();
  const year = url.searchParams.get("year")
    ? parseInt(url.searchParams.get("year")!, 10)
    : now.getFullYear();

  if (isNaN(year)) {
    return errorResponse("Invalid year parameter", 400, request);
  }

  try {
    const trends = await getYearlyTrends(env.DB, year);
    return jsonResponse(trends, 200, request);
  } catch (err) {
    console.error("Dashboard trends error:", err);
    return errorResponse("Failed to load dashboard trends", 500, request);
  }
}

export async function workload(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year")) || now.getFullYear();
  const quarter =
    Number(url.searchParams.get("quarter")) || Math.ceil((now.getMonth() + 1) / 3);

  const technicians = await getTechnicianWorkload(env.DB, year, quarter);
  return jsonResponse({ technicians }, 200, request);
}

export async function entityDetail(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const now = new Date();
  const year = url.searchParams.get("year")
    ? parseInt(url.searchParams.get("year")!, 10)
    : now.getFullYear();
  const quarter = url.searchParams.get("quarter")
    ? parseInt(url.searchParams.get("quarter")!, 10)
    : Math.ceil((now.getMonth() + 1) / 3);

  if (isNaN(year) || isNaN(quarter) || quarter < 1 || quarter > 4) {
    return errorResponse("Invalid year or quarter parameter", 400, request);
  }

  try {
    const detail = await getEntityDetail(env.DB, id, year, quarter);
    if (!detail) {
      return errorResponse("Entity not found", 404, request);
    }
    return jsonResponse(detail, 200, request);
  } catch (err) {
    console.error("Entity detail error:", err);
    return errorResponse("Failed to load entity detail", 500, request);
  }
}
