import type { Env, TechnicianRow } from "../types";

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
