import { hash } from "bcryptjs";
import type { Env, AuthSession, TechnicianRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { listTechnicians, getTechnicianById } from "../db/queries";
import { logAudit } from "../db/audit";

function sanitizeTechnician(row: TechnicianRow) {
  let assignedEntities: string[] = [];
  try {
    assignedEntities = JSON.parse(row.assigned_entities);
  } catch {
    assignedEntities = [];
  }

  const { password_hash: _, ...rest } = row;
  return {
    ...rest,
    assigned_entities: assignedEntities,
    is_active: Boolean(row.is_active),
  };
}

export async function getTechnicians(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const technicians = await listTechnicians(env.DB);
  return jsonResponse(technicians.map(sanitizeTechnician), 200, request);
}

export async function getTechnician(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const technician = await getTechnicianById(env.DB, id);
  if (!technician) {
    return errorResponse("Technician not found", 404, request);
  }

  return jsonResponse(sanitizeTechnician(technician), 200, request);
}

export async function createTechnician(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "admin");
  if (roleError) return roleError;

  let body: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    phone?: string;
    assigned_entities?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { name, email, password, role, phone, assigned_entities } = body;
  if (!name || !email || !password) {
    return errorResponse(
      "name, email, and password are required",
      400,
      request
    );
  }

  const validRoles = ["technician", "lead", "admin"];
  const techRole = role || "technician";
  if (!validRoles.includes(techRole)) {
    return errorResponse(
      `role must be one of: ${validRoles.join(", ")}`,
      400,
      request
    );
  }

  const id = `tech-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const passwordHash = await hash(password, 10);
  const entitiesJson = JSON.stringify(assigned_entities || []);

  await env.DB.prepare(
    "INSERT INTO technicians (id, name, role, email, phone, assigned_entities, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)"
  )
    .bind(id, name, techRole, email, phone || null, entitiesJson, passwordHash, now, now)
    .run();

  const created = await getTechnicianById(env.DB, id);

  try {
    await logAudit(env.DB, {
      actor_id: session.technician_id,
      actor_name: session.name,
      action: "create",
      resource_type: "technician",
      resource_id: id,
      details: `Created technician ${name}`,
    });
  } catch { /* audit failure should not break main operation */ }

  return jsonResponse(sanitizeTechnician(created!), 201, request);
}

export async function updateTechnician(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "admin");
  if (roleError) return roleError;

  const existing = await getTechnicianById(env.DB, id);
  if (!existing) {
    return errorResponse("Technician not found", 404, request);
  }

  let body: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    phone?: string;
    assigned_entities?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const validRoles = ["technician", "lead", "admin"];
  if (body.role && !validRoles.includes(body.role)) {
    return errorResponse(
      `role must be one of: ${validRoles.join(", ")}`,
      400,
      request
    );
  }

  const name = body.name ?? existing.name;
  const email = body.email ?? existing.email;
  const role = body.role ?? existing.role;
  const phone = body.phone !== undefined ? body.phone : existing.phone;
  const assignedEntities = body.assigned_entities
    ? JSON.stringify(body.assigned_entities)
    : existing.assigned_entities;
  const now = new Date().toISOString();

  if (body.password) {
    const passwordHash = await hash(body.password, 10);
    await env.DB.prepare(
      "UPDATE technicians SET name = ?, email = ?, role = ?, phone = ?, assigned_entities = ?, password_hash = ?, updated_at = ? WHERE id = ?"
    )
      .bind(name, email, role, phone, assignedEntities, passwordHash, now, id)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE technicians SET name = ?, email = ?, role = ?, phone = ?, assigned_entities = ?, updated_at = ? WHERE id = ?"
    )
      .bind(name, email, role, phone, assignedEntities, now, id)
      .run();
  }

  const updated = await getTechnicianById(env.DB, id);

  try {
    await logAudit(env.DB, {
      actor_id: session.technician_id,
      actor_name: session.name,
      action: "update",
      resource_type: "technician",
      resource_id: id,
      details: `Updated technician ${name}`,
    });
  } catch { /* audit failure should not break main operation */ }

  return jsonResponse(sanitizeTechnician(updated!), 200, request);
}
