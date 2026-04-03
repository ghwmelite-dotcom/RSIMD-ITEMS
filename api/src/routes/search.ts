import type { Env } from "../types";
import { jsonResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

export async function search(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return jsonResponse({ equipment: [], logs: [], entities: [] }, 200, request);
  }

  const term = `%${q}%`;

  const [equipment, logs, entities] = await Promise.all([
    env.DB.prepare(
      "SELECT id, asset_tag, type, make, model FROM equipment WHERE (asset_tag LIKE ? OR make LIKE ? OR model LIKE ?) AND status != 'decommissioned' LIMIT 5"
    )
      .bind(term, term, term)
      .all(),
    env.DB.prepare(
      "SELECT id, description, maintenance_type, logged_date FROM maintenance_logs WHERE description LIKE ? ORDER BY logged_date DESC LIMIT 5"
    )
      .bind(term)
      .all(),
    env.DB.prepare(
      "SELECT id, name, code, type FROM org_entities WHERE (name LIKE ? OR code LIKE ?) AND is_active = 1 LIMIT 5"
    )
      .bind(term, term)
      .all(),
  ]);

  return jsonResponse(
    {
      equipment: equipment.results,
      logs: logs.results,
      entities: entities.results,
    },
    200,
    request
  );
}
