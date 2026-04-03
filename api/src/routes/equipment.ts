import type { Env, AuthSession, EquipmentRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import {
  listEquipment,
  getEquipmentById,
  getEquipmentByTag,
  getMaintenanceForEquipment,
} from "../db/queries";

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
  return jsonResponse(equipment, 200, request);
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

  const maintenance_history = await getMaintenanceForEquipment(env.DB, id);
  return jsonResponse({ equipment, maintenance_history }, 200, request);
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

  const maintenance_history = await getMaintenanceForEquipment(
    env.DB,
    equipment.id
  );
  return jsonResponse({ equipment, maintenance_history }, 200, request);
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
    `INSERT INTO equipment (id, asset_tag, type, make, model, processor, serial_number, org_entity_id, room_number, status, installed_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
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
      now,
      now
    )
    .run();

  const created = await getEquipmentById(env.DB, id);
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
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE equipment SET type = ?, make = ?, model = ?, processor = ?, serial_number = ?, org_entity_id = ?, room_number = ?, status = ?, installed_date = ?, notes = ?, updated_at = ? WHERE id = ?`
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
      now,
      id
    )
    .run();

  const updated = await getEquipmentById(env.DB, id);
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

  return jsonResponse({ success: true }, 200, request);
}
