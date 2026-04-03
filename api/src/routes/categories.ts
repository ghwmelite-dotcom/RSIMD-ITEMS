import type { Env, AuthSession, MaintenanceCategoryRow } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate, requireRole } from "../middleware/auth";
import { listCategories } from "../db/queries";

function formatCategory(row: MaintenanceCategoryRow) {
  return {
    ...row,
    is_active: Boolean(row.is_active),
  };
}

export async function getCategories(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const categories = await listCategories(env.DB);
  return jsonResponse(categories.map(formatCategory), 200, request);
}

export async function createCategory(
  request: Request,
  env: Env
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "admin");
  if (roleError) return roleError;

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { name, description } = body;
  if (!name) {
    return errorResponse("name is required", 400, request);
  }

  const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO maintenance_categories (id, name, description, is_active, created_at) VALUES (?, ?, ?, 1, ?)"
  )
    .bind(id, name, description || null, now)
    .run();

  const created = await env.DB.prepare(
    "SELECT * FROM maintenance_categories WHERE id = ?"
  )
    .bind(id)
    .first<MaintenanceCategoryRow>();

  return jsonResponse(formatCategory(created!), 201, request);
}

export async function updateCategory(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;
  const session = sessionOrError as AuthSession;

  const roleError = requireRole(session, request, "admin");
  if (roleError) return roleError;

  const existing = await env.DB.prepare(
    "SELECT * FROM maintenance_categories WHERE id = ?"
  )
    .bind(id)
    .first<MaintenanceCategoryRow>();

  if (!existing) {
    return errorResponse("Category not found", 404, request);
  }

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const name = body.name ?? existing.name;
  const description =
    body.description !== undefined ? body.description : existing.description;

  await env.DB.prepare(
    "UPDATE maintenance_categories SET name = ?, description = ? WHERE id = ?"
  )
    .bind(name, description, id)
    .run();

  const updated = await env.DB.prepare(
    "SELECT * FROM maintenance_categories WHERE id = ?"
  )
    .bind(id)
    .first<MaintenanceCategoryRow>();

  return jsonResponse(formatCategory(updated!), 200, request);
}
