import type { Env, AuthSession, MaintenanceLogRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { listMaintenanceLogs, getMaintenanceLog } from "../db/queries";

const VALID_MAINTENANCE_TYPES = [
  "condition_based",
  "routine",
  "corrective",
  "emergency",
  "predictive",
] as const;

const VALID_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "escalated",
] as const;

function parsePhotoUrls(log: MaintenanceLogRow): MaintenanceLogRow & { photo_urls: string[] } {
  let parsed: string[] = [];
  try {
    parsed = JSON.parse(log.photo_urls as string);
  } catch {
    parsed = [];
  }
  return { ...log, photo_urls: parsed } as unknown as MaintenanceLogRow & { photo_urls: string[] };
}

export async function listLogs(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const filters = {
    year: url.searchParams.get("year")
      ? parseInt(url.searchParams.get("year")!, 10)
      : undefined,
    quarter: url.searchParams.get("quarter")
      ? parseInt(url.searchParams.get("quarter")!, 10)
      : undefined,
    maintenance_type: url.searchParams.get("maintenance_type") || undefined,
    org_entity_id: url.searchParams.get("org_entity_id") || undefined,
    category_id: url.searchParams.get("category_id") || undefined,
  };

  const logs = await listMaintenanceLogs(env.DB, filters);
  const parsed = logs.map(parsePhotoUrls);
  return jsonResponse(parsed, 200, request);
}

export async function getLog(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const log = await getMaintenanceLog(env.DB, id);
  if (!log) {
    return errorResponse("Maintenance log not found", 404, request);
  }

  return jsonResponse(parsePhotoUrls(log), 200, request);
}

export async function createLog(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  let body: {
    equipment_id?: string;
    org_entity_id?: string;
    maintenance_type?: string;
    category_id?: string;
    room_number?: string;
    description?: string;
    resolution?: string;
    status?: string;
    logged_date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { org_entity_id, maintenance_type, description } = body;
  if (!org_entity_id || !maintenance_type || !description) {
    return errorResponse(
      "org_entity_id, maintenance_type, and description are required",
      400,
      request
    );
  }

  if (
    !VALID_MAINTENANCE_TYPES.includes(
      maintenance_type as (typeof VALID_MAINTENANCE_TYPES)[number]
    )
  ) {
    return errorResponse(
      `maintenance_type must be one of: ${VALID_MAINTENANCE_TYPES.join(", ")}`,
      400,
      request
    );
  }

  if (
    body.status &&
    !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])
  ) {
    return errorResponse(
      `status must be one of: ${VALID_STATUSES.join(", ")}`,
      400,
      request
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const loggedDate = body.logged_date ?? now.split("T")[0]!;
  const dateObj = new Date(loggedDate);
  const month = dateObj.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  const year = dateObj.getFullYear();
  const status = body.status ?? "pending";

  await env.DB.prepare(
    `INSERT INTO maintenance_logs (id, equipment_id, technician_id, org_entity_id, maintenance_type, category_id, room_number, description, resolution, status, photo_urls, logged_date, quarter, month, year, created_offline, synced_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 0, NULL, ?, ?)`
  )
    .bind(
      id,
      body.equipment_id || null,
      session.technician_id,
      org_entity_id,
      maintenance_type,
      body.category_id || null,
      body.room_number || null,
      description,
      body.resolution || null,
      status,
      loggedDate,
      quarter,
      month,
      year,
      now,
      now
    )
    .run();

  const created = await getMaintenanceLog(env.DB, id);
  if (!created) {
    return errorResponse("Failed to create maintenance log", 500, request);
  }
  return jsonResponse(parsePhotoUrls(created), 201, request);
}

export async function updateLog(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const existing = await getMaintenanceLog(env.DB, id);
  if (!existing) {
    return errorResponse("Maintenance log not found", 404, request);
  }

  let body: {
    maintenance_type?: string;
    category_id?: string;
    room_number?: string;
    description?: string;
    resolution?: string;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  if (
    body.maintenance_type &&
    !VALID_MAINTENANCE_TYPES.includes(
      body.maintenance_type as (typeof VALID_MAINTENANCE_TYPES)[number]
    )
  ) {
    return errorResponse(
      `maintenance_type must be one of: ${VALID_MAINTENANCE_TYPES.join(", ")}`,
      400,
      request
    );
  }

  if (
    body.status &&
    !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])
  ) {
    return errorResponse(
      `status must be one of: ${VALID_STATUSES.join(", ")}`,
      400,
      request
    );
  }

  const maintenance_type = body.maintenance_type ?? existing.maintenance_type;
  const category_id =
    body.category_id !== undefined ? body.category_id : existing.category_id;
  const room_number =
    body.room_number !== undefined ? body.room_number : existing.room_number;
  const description = body.description ?? existing.description;
  const resolution =
    body.resolution !== undefined ? body.resolution : existing.resolution;
  const status = body.status ?? existing.status;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE maintenance_logs SET maintenance_type = ?, category_id = ?, room_number = ?, description = ?, resolution = ?, status = ?, updated_at = ? WHERE id = ?`
  )
    .bind(
      maintenance_type,
      category_id,
      room_number,
      description,
      resolution,
      status,
      now,
      id
    )
    .run();

  const updated = await getMaintenanceLog(env.DB, id);
  if (!updated) {
    return errorResponse("Failed to retrieve updated log", 500, request);
  }
  return jsonResponse(parsePhotoUrls(updated), 200, request);
}

export async function bulkSync(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  let body: {
    logs?: Array<{
      id?: string;
      equipment_id?: string;
      org_entity_id?: string;
      maintenance_type?: string;
      category_id?: string;
      room_number?: string;
      description?: string;
      resolution?: string;
      status?: string;
      logged_date?: string;
      photo_urls?: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  if (!body.logs || !Array.isArray(body.logs)) {
    return errorResponse("logs array is required", 400, request);
  }

  let synced_count = 0;
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < body.logs.length; i++) {
    const log = body.logs[i]!;
    try {
      if (!log.org_entity_id || !log.maintenance_type || !log.description) {
        errors.push({
          index: i,
          error: "org_entity_id, maintenance_type, and description are required",
        });
        continue;
      }

      if (
        !VALID_MAINTENANCE_TYPES.includes(
          log.maintenance_type as (typeof VALID_MAINTENANCE_TYPES)[number]
        )
      ) {
        errors.push({
          index: i,
          error: `Invalid maintenance_type: ${log.maintenance_type}`,
        });
        continue;
      }

      const id = log.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const loggedDate = log.logged_date ?? now.split("T")[0]!;
      const dateObj = new Date(loggedDate);
      const month = dateObj.getMonth() + 1;
      const quarter = Math.ceil(month / 3);
      const year = dateObj.getFullYear();
      const status = log.status || "pending";
      const photoUrls = log.photo_urls || "[]";

      await env.DB.prepare(
        `INSERT INTO maintenance_logs (id, equipment_id, technician_id, org_entity_id, maintenance_type, category_id, room_number, description, resolution, status, photo_urls, logged_date, quarter, month, year, created_offline, synced_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), ?, ?)`
      )
        .bind(
          id,
          log.equipment_id || null,
          session.technician_id,
          log.org_entity_id,
          log.maintenance_type,
          log.category_id || null,
          log.room_number || null,
          log.description,
          log.resolution || null,
          status,
          photoUrls,
          loggedDate,
          quarter,
          month,
          year,
          now,
          now
        )
        .run();

      synced_count++;
    } catch (err) {
      errors.push({
        index: i,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return jsonResponse({ synced_count, errors }, 200, request);
}
