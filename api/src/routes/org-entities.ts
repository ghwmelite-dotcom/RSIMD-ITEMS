import type { Env, AuthSession, OrgEntityRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { listOrgEntities, getOrgEntity } from "../db/queries";

const VALID_TYPES = ["directorate", "unit", "secretariat"] as const;

function formatEntity(row: OrgEntityRow) {
  let rooms: string[] = [];
  try {
    rooms = JSON.parse(row.rooms);
  } catch {
    rooms = [];
  }
  return {
    ...row,
    rooms,
    is_active: Boolean(row.is_active),
  };
}

export async function listEntities(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const typeFilter = url.searchParams.get("type") || undefined;

  const entities = await listOrgEntities(env.DB, typeFilter);
  return jsonResponse(entities.map(formatEntity), 200, request);
}

export async function getEntity(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const entity = await getOrgEntity(env.DB, id);
  if (!entity) {
    return errorResponse("Entity not found", 404, request);
  }

  return jsonResponse(formatEntity(entity), 200, request);
}

export async function createEntity(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "admin");
  if (roleError) return roleError;

  let body: { name?: string; code?: string; type?: string; rooms?: string[] };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { name, code, type, rooms } = body;
  if (!name || !code || !type) {
    return errorResponse("name, code, and type are required", 400, request);
  }

  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return errorResponse(
      `type must be one of: ${VALID_TYPES.join(", ")}`,
      400,
      request
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const roomsJson = JSON.stringify(rooms || []);

  await env.DB.prepare(
    "INSERT INTO org_entities (id, name, code, type, rooms, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)"
  )
    .bind(id, name, code, type, roomsJson, now, now)
    .run();

  const created = await getOrgEntity(env.DB, id);
  return jsonResponse(formatEntity(created!), 201, request);
}

export async function updateEntity(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "admin");
  if (roleError) return roleError;

  const existing = await getOrgEntity(env.DB, id);
  if (!existing) {
    return errorResponse("Entity not found", 404, request);
  }

  let body: {
    name?: string;
    code?: string;
    type?: string;
    rooms?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  if (
    body.type &&
    !VALID_TYPES.includes(body.type as (typeof VALID_TYPES)[number])
  ) {
    return errorResponse(
      `type must be one of: ${VALID_TYPES.join(", ")}`,
      400,
      request
    );
  }

  const name = body.name ?? existing.name;
  const code = body.code ?? existing.code;
  const type = body.type ?? existing.type;
  const rooms = body.rooms ? JSON.stringify(body.rooms) : existing.rooms;
  const now = new Date().toISOString();

  await env.DB.prepare(
    "UPDATE org_entities SET name = ?, code = ?, type = ?, rooms = ?, updated_at = ? WHERE id = ?"
  )
    .bind(name, code, type, rooms, now, id)
    .run();

  const updated = await getOrgEntity(env.DB, id);
  return jsonResponse(formatEntity(updated!), 200, request);
}

export async function deleteEntity(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "admin");
  if (roleError) return roleError;

  const existing = await getOrgEntity(env.DB, id);
  if (!existing) {
    return errorResponse("Entity not found", 404, request);
  }

  await env.DB.prepare(
    "UPDATE org_entities SET is_active = 0, updated_at = ? WHERE id = ?"
  )
    .bind(new Date().toISOString(), id)
    .run();

  return jsonResponse({ success: true }, 200, request);
}
