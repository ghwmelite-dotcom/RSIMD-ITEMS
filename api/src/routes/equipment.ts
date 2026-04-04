import type { Env, AuthSession, EquipmentRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { logAudit } from "../db/audit";
import {
  listEquipment,
  getEquipmentById,
  getEquipmentByTag,
  getMaintenanceForEquipment,
  getEquipmentLogStats,
  getAllEquipmentLogStats,
} from "../db/queries";
import { calculateHealthScore, getWin11Readiness } from "../services/health-score";

const VALID_TYPES = [
  "desktop",
  "laptop",
  "printer",
  "scanner",
  "router",
  "switch",
  "access_point",
  "cctv",
  "ups",
  "other",
] as const;

const VALID_STATUSES = [
  "active",
  "faulty",
  "decommissioned",
  "under_repair",
] as const;

function generateAssetTag(type: string): string {
  const prefix = type.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `OHCS-${prefix}-${timestamp}`;
}

export async function listEquipmentHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const filters = {
    org_entity_id: url.searchParams.get("org_entity_id") || undefined,
    status: url.searchParams.get("status") || undefined,
    type: url.searchParams.get("type") || undefined,
  };

  const equipment = await listEquipment(env.DB, filters);
  const logStatsMap = await getAllEquipmentLogStats(env.DB);

  const enriched = equipment.map((item) => {
    const stats = logStatsMap.get(item.id) ?? { corrective_emergency_count: 0, last_log_date: null };
    return {
      ...item,
      health_score: calculateHealthScore(item, stats.corrective_emergency_count, stats.last_log_date),
      win11_readiness: getWin11Readiness(item.os_version, item.processor_gen),
    };
  });

  return jsonResponse(enriched, 200, request);
}

export async function getEquipmentHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const equipment = await getEquipmentById(env.DB, id);
  if (!equipment) {
    return errorResponse("Equipment not found", 404, request);
  }

  const [maintenance_history, logStats] = await Promise.all([
    getMaintenanceForEquipment(env.DB, id),
    getEquipmentLogStats(env.DB, id),
  ]);

  const enrichedEquipment = {
    ...equipment,
    health_score: calculateHealthScore(equipment, logStats.corrective_emergency_count, logStats.last_log_date),
    win11_readiness: getWin11Readiness(equipment.os_version, equipment.processor_gen),
  };

  return jsonResponse({ equipment: enrichedEquipment, maintenance_history }, 200, request);
}

export async function getEquipmentByTagHandler(
  request: Request,
  env: Env,
  assetTag: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const equipment = await getEquipmentByTag(env.DB, assetTag);
  if (!equipment) {
    return errorResponse("Equipment not found for this asset tag", 404, request);
  }

  const [maintenance_history, logStats] = await Promise.all([
    getMaintenanceForEquipment(env.DB, equipment.id),
    getEquipmentLogStats(env.DB, equipment.id),
  ]);

  const enrichedEquipment = {
    ...equipment,
    health_score: calculateHealthScore(equipment, logStats.corrective_emergency_count, logStats.last_log_date),
    win11_readiness: getWin11Readiness(equipment.os_version, equipment.processor_gen),
  };

  return jsonResponse({ equipment: enrichedEquipment, maintenance_history }, 200, request);
}

export async function createEquipmentHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  let body: {
    type?: string;
    make?: string;
    model?: string;
    processor?: string;
    serial_number?: string;
    org_entity_id?: string;
    room_number?: string;
    installed_date?: string;
    notes?: string;
    os_version?: string;
    processor_gen?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { type, org_entity_id } = body;
  if (!type || !org_entity_id) {
    return errorResponse("type and org_entity_id are required", 400, request);
  }

  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return errorResponse(
      `type must be one of: ${VALID_TYPES.join(", ")}`,
      400,
      request
    );
  }

  const id = crypto.randomUUID();
  const asset_tag = generateAssetTag(type);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO equipment (id, asset_tag, type, make, model, processor, serial_number, org_entity_id, room_number, status, installed_date, notes, os_version, processor_gen, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      asset_tag,
      type,
      body.make || null,
      body.model || null,
      body.processor || null,
      body.serial_number || null,
      org_entity_id,
      body.room_number || null,
      body.installed_date || null,
      body.notes || null,
      body.os_version || null,
      body.processor_gen || null,
      now,
      now
    )
    .run();

  const created = await getEquipmentById(env.DB, id);

  try {
    await logAudit(env.DB, {
      actor_id: sessionOrError.technician_id,
      actor_name: sessionOrError.name,
      action: "create",
      resource_type: "equipment",
      resource_id: id,
      details: `Created ${type} (${asset_tag})`,
    });
  } catch { /* audit log failure should not break main operation */ }

  return jsonResponse(created, 201, request);
}

export async function updateEquipmentHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const existing = await getEquipmentById(env.DB, id);
  if (!existing) {
    return errorResponse("Equipment not found", 404, request);
  }

  let body: {
    type?: string;
    make?: string;
    model?: string;
    processor?: string;
    serial_number?: string;
    org_entity_id?: string;
    room_number?: string;
    status?: string;
    installed_date?: string;
    notes?: string;
    os_version?: string;
    processor_gen?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  if (body.type && !VALID_TYPES.includes(body.type as (typeof VALID_TYPES)[number])) {
    return errorResponse(
      `type must be one of: ${VALID_TYPES.join(", ")}`,
      400,
      request
    );
  }

  if (body.status && !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
    return errorResponse(
      `status must be one of: ${VALID_STATUSES.join(", ")}`,
      400,
      request
    );
  }

  const type = body.type ?? existing.type;
  const make = body.make !== undefined ? body.make : existing.make;
  const model = body.model !== undefined ? body.model : existing.model;
  const processor = body.processor !== undefined ? body.processor : existing.processor;
  const serial_number = body.serial_number !== undefined ? body.serial_number : existing.serial_number;
  const org_entity_id = body.org_entity_id ?? existing.org_entity_id;
  const room_number = body.room_number !== undefined ? body.room_number : existing.room_number;
  const status = body.status ?? existing.status;
  const installed_date = body.installed_date !== undefined ? body.installed_date : existing.installed_date;
  const notes = body.notes !== undefined ? body.notes : existing.notes;
  const os_version = body.os_version !== undefined ? body.os_version : existing.os_version;
  const processor_gen = body.processor_gen !== undefined ? body.processor_gen : existing.processor_gen;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE equipment SET type = ?, make = ?, model = ?, processor = ?, serial_number = ?, org_entity_id = ?, room_number = ?, status = ?, installed_date = ?, notes = ?, os_version = ?, processor_gen = ?, updated_at = ? WHERE id = ?`
  )
    .bind(
      type,
      make,
      model,
      processor,
      serial_number,
      org_entity_id,
      room_number,
      status,
      installed_date,
      notes,
      os_version,
      processor_gen,
      now,
      id
    )
    .run();

  const updated = await getEquipmentById(env.DB, id);

  try {
    await logAudit(env.DB, {
      actor_id: sessionOrError.technician_id,
      actor_name: sessionOrError.name,
      action: "update",
      resource_type: "equipment",
      resource_id: id,
      details: `Updated equipment ${existing.asset_tag}`,
    });
  } catch { /* audit log failure should not break main operation */ }

  return jsonResponse(updated, 200, request);
}

export async function deleteEquipmentHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const existing = await getEquipmentById(env.DB, id);
  if (!existing) {
    return errorResponse("Equipment not found", 404, request);
  }

  await env.DB.prepare(
    "UPDATE equipment SET status = 'decommissioned', updated_at = ? WHERE id = ?"
  )
    .bind(new Date().toISOString(), id)
    .run();

  try {
    await logAudit(env.DB, {
      actor_id: sessionOrError.technician_id,
      actor_name: sessionOrError.name,
      action: "delete",
      resource_type: "equipment",
      resource_id: id,
      details: `Decommissioned equipment ${existing.asset_tag}`,
    });
  } catch { /* audit log failure should not break main operation */ }

  return jsonResponse({ success: true }, 200, request);
}

export async function bulkImportHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const roleError = requireRole(sessionOrError, request, "admin");
  if (roleError) return roleError;

  let body: {
    items: Array<{
      type: string;
      make?: string;
      model?: string;
      processor?: string;
      serial_number?: string;
      org_entity_id: string;
      room_number?: string;
      installed_date?: string;
      notes?: string;
      os_version?: string;
      processor_gen?: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, request);
  }

  if (!Array.isArray(body.items)) {
    return errorResponse("items array required", 400, request);
  }

  let imported = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i]!;
    if (!item.type || !item.org_entity_id) {
      errors.push({ row: i + 1, message: "type and org_entity_id are required" });
      continue;
    }

    try {
      const id = crypto.randomUUID();
      const prefix = item.type.substring(0, 3).toUpperCase();
      const assetTag = `OHCS-${prefix}-${Date.now().toString(36).toUpperCase()}${i}`;

      await env.DB.prepare(
        `INSERT INTO equipment (id, asset_tag, type, make, model, processor, serial_number, org_entity_id, room_number, status, installed_date, notes, os_version, processor_gen, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
        .bind(
          id,
          assetTag,
          item.type,
          item.make ?? null,
          item.model ?? null,
          item.processor ?? null,
          item.serial_number ?? null,
          item.org_entity_id,
          item.room_number ?? null,
          item.installed_date ?? null,
          item.notes ?? null,
          item.os_version ?? null,
          item.processor_gen ?? null
        )
        .run();
      imported++;
    } catch (err) {
      errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Insert failed",
      });
    }
  }

  try {
    await logAudit(env.DB, {
      actor_id: sessionOrError.technician_id,
      actor_name: sessionOrError.name,
      action: "create",
      resource_type: "equipment",
      details: `Bulk imported ${imported} equipment items (${errors.length} errors)`,
    });
  } catch { /* audit log failure should not break main operation */ }

  return jsonResponse({ imported, errors }, 200, request);
}
