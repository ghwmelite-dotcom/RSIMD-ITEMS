import type { TechnicianRow, OrgEntityRow, MaintenanceCategoryRow } from "../types";

export async function getTechnicianByEmail(
  db: D1Database,
  email: string
): Promise<TechnicianRow | null> {
  const result = await db
    .prepare("SELECT * FROM technicians WHERE email = ? AND is_active = 1")
    .bind(email)
    .first<TechnicianRow>();
  return result;
}

export async function getTechnicianById(
  db: D1Database,
  id: string
): Promise<TechnicianRow | null> {
  const result = await db
    .prepare("SELECT * FROM technicians WHERE id = ? AND is_active = 1")
    .bind(id)
    .first<TechnicianRow>();
  return result;
}

export async function listOrgEntities(
  db: D1Database,
  typeFilter?: string
): Promise<OrgEntityRow[]> {
  if (typeFilter) {
    const result = await db
      .prepare(
        "SELECT * FROM org_entities WHERE is_active = 1 AND type = ? ORDER BY type, name"
      )
      .bind(typeFilter)
      .all<OrgEntityRow>();
    return result.results;
  }
  const result = await db
    .prepare(
      "SELECT * FROM org_entities WHERE is_active = 1 ORDER BY type, name"
    )
    .all<OrgEntityRow>();
  return result.results;
}

export async function getOrgEntity(
  db: D1Database,
  id: string
): Promise<OrgEntityRow | null> {
  return db
    .prepare("SELECT * FROM org_entities WHERE id = ?")
    .bind(id)
    .first<OrgEntityRow>();
}

export async function listCategories(
  db: D1Database
): Promise<MaintenanceCategoryRow[]> {
  const result = await db
    .prepare(
      "SELECT * FROM maintenance_categories WHERE is_active = 1 ORDER BY name"
    )
    .all<MaintenanceCategoryRow>();
  return result.results;
}

export async function listTechnicians(
  db: D1Database
): Promise<TechnicianRow[]> {
  const result = await db
    .prepare(
      "SELECT id, name, role, email, phone, assigned_entities, is_active, created_at, updated_at FROM technicians WHERE is_active = 1 ORDER BY name"
    )
    .all<TechnicianRow>();
  return result.results;
}
