export async function logAudit(
  db: D1Database,
  entry: {
    actor_id: string;
    actor_name: string;
    action: "create" | "update" | "delete";
    resource_type: string;
    resource_id?: string;
    details?: string;
  }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO audit_log (id, actor_id, actor_name, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      crypto.randomUUID(),
      entry.actor_id,
      entry.actor_name,
      entry.action,
      entry.resource_type,
      entry.resource_id ?? null,
      entry.details ?? null
    )
    .run();
}
