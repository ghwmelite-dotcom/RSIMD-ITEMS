import type { TechnicianRow, OrgEntityRow, MaintenanceCategoryRow, EquipmentRow, MaintenanceLogRow } from "../types";

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

export async function listEquipment(
  db: D1Database,
  filters: { org_entity_id?: string; status?: string; type?: string }
): Promise<EquipmentRow[]> {
  let sql = "SELECT * FROM equipment WHERE 1=1";
  const binds: string[] = [];

  if (filters.org_entity_id) {
    sql += " AND org_entity_id = ?";
    binds.push(filters.org_entity_id);
  }
  if (filters.status) {
    sql += " AND status = ?";
    binds.push(filters.status);
  }
  if (filters.type) {
    sql += " AND type = ?";
    binds.push(filters.type);
  }
  sql += " AND status != 'decommissioned' ORDER BY created_at DESC";

  const stmt = db.prepare(sql);
  const result =
    binds.length > 0
      ? await stmt.bind(...binds).all<EquipmentRow>()
      : await stmt.all<EquipmentRow>();
  return result.results;
}

export async function getEquipmentById(
  db: D1Database,
  id: string
): Promise<EquipmentRow | null> {
  return db
    .prepare("SELECT * FROM equipment WHERE id = ?")
    .bind(id)
    .first<EquipmentRow>();
}

export async function getEquipmentByTag(
  db: D1Database,
  tag: string
): Promise<EquipmentRow | null> {
  return db
    .prepare("SELECT * FROM equipment WHERE asset_tag = ?")
    .bind(tag)
    .first<EquipmentRow>();
}

export async function getMaintenanceForEquipment(
  db: D1Database,
  equipmentId: string
): Promise<MaintenanceLogRow[]> {
  const result = await db
    .prepare(
      "SELECT * FROM maintenance_logs WHERE equipment_id = ? ORDER BY logged_date DESC LIMIT 50"
    )
    .bind(equipmentId)
    .all<MaintenanceLogRow>();
  return result.results;
}

export async function listMaintenanceLogs(
  db: D1Database,
  filters: {
    year?: number;
    quarter?: number;
    maintenance_type?: string;
    org_entity_id?: string;
    category_id?: string;
    equipment_id?: string;
  }
): Promise<MaintenanceLogRow[]> {
  let sql = "SELECT * FROM maintenance_logs WHERE 1=1";
  const binds: (string | number)[] = [];

  if (filters.year) {
    sql += " AND year = ?";
    binds.push(filters.year);
  }
  if (filters.quarter) {
    sql += " AND quarter = ?";
    binds.push(filters.quarter);
  }
  if (filters.maintenance_type) {
    sql += " AND maintenance_type = ?";
    binds.push(filters.maintenance_type);
  }
  if (filters.org_entity_id) {
    sql += " AND org_entity_id = ?";
    binds.push(filters.org_entity_id);
  }
  if (filters.category_id) {
    sql += " AND category_id = ?";
    binds.push(filters.category_id);
  }
  if (filters.equipment_id) {
    sql += " AND equipment_id = ?";
    binds.push(filters.equipment_id);
  }

  sql += " ORDER BY logged_date DESC LIMIT 200";

  const stmt = db.prepare(sql);
  const result =
    binds.length > 0
      ? await stmt.bind(...binds).all<MaintenanceLogRow>()
      : await stmt.all<MaintenanceLogRow>();
  return result.results;
}

export async function getMaintenanceLog(
  db: D1Database,
  id: string
): Promise<MaintenanceLogRow | null> {
  return db
    .prepare("SELECT * FROM maintenance_logs WHERE id = ?")
    .bind(id)
    .first<MaintenanceLogRow>();
}

export async function getEquipmentLogStats(
  db: D1Database,
  equipmentId: string
): Promise<{ corrective_emergency_count: number; last_log_date: string | null }> {
  const [countResult, lastDateResult] = await Promise.all([
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM maintenance_logs WHERE equipment_id = ? AND maintenance_type IN ('corrective', 'emergency')"
      )
      .bind(equipmentId)
      .first<{ cnt: number }>(),
    db
      .prepare(
        "SELECT MAX(logged_date) as last_date FROM maintenance_logs WHERE equipment_id = ?"
      )
      .bind(equipmentId)
      .first<{ last_date: string | null }>(),
  ]);

  return {
    corrective_emergency_count: countResult?.cnt ?? 0,
    last_log_date: lastDateResult?.last_date ?? null,
  };
}

export async function getAllEquipmentLogStats(
  db: D1Database
): Promise<Map<string, { corrective_emergency_count: number; last_log_date: string | null }>> {
  const [countResults, lastDateResults] = await Promise.all([
    db
      .prepare(
        "SELECT equipment_id, COUNT(*) as cnt FROM maintenance_logs WHERE maintenance_type IN ('corrective', 'emergency') AND equipment_id IS NOT NULL GROUP BY equipment_id"
      )
      .all<{ equipment_id: string; cnt: number }>(),
    db
      .prepare(
        "SELECT equipment_id, MAX(logged_date) as last_date FROM maintenance_logs WHERE equipment_id IS NOT NULL GROUP BY equipment_id"
      )
      .all<{ equipment_id: string; last_date: string | null }>(),
  ]);

  const statsMap = new Map<string, { corrective_emergency_count: number; last_log_date: string | null }>();

  for (const row of countResults.results) {
    statsMap.set(row.equipment_id, {
      corrective_emergency_count: row.cnt,
      last_log_date: null,
    });
  }

  for (const row of lastDateResults.results) {
    const existing = statsMap.get(row.equipment_id);
    if (existing) {
      existing.last_log_date = row.last_date;
    } else {
      statsMap.set(row.equipment_id, {
        corrective_emergency_count: 0,
        last_log_date: row.last_date,
      });
    }
  }

  return statsMap;
}
