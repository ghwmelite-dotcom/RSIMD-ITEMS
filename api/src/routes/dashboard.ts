import type { Env } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { getDashboardSummary, getYearlyTrends } from "../services/aggregator";

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
    const summary = await getDashboardSummary(env.DB, year, quarter);
    return jsonResponse(summary, 200, request);
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
