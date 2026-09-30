import type { Env } from "../types";
import { authenticate } from "../middleware/auth";
import { errorResponse, jsonResponse } from "../middleware/error-handler";
import { observationKeys, sha256, teamFormsAvailable, validateTeamForm } from "../services/team-form";

export async function teamFormImport(request: Request, env: Env, commit: boolean): Promise<Response> {
  const session = await authenticate(request, env);
  if (session instanceof Response) return session;
  const actor = await env.DB.prepare("SELECT is_active FROM technicians WHERE id = ?").bind(session.technician_id).first<{ is_active: number }>();
  if (!actor?.is_active) return errorResponse("Account is inactive", 403, request);
  if (!await teamFormsAvailable(env.DB)) return errorResponse("Team forms are not enabled yet. Apply migration-004-team-forms.sql before uploading.", 503, request);
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 1_000_000) { await reader.cancel(); return errorResponse("Form exceeds the 1 MB data limit", 413, request); }
      chunks.push(chunk.value);
    }
  }
  const combined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
  const bodyText = new TextDecoder().decode(combined);
  let body: unknown;
  try { body = JSON.parse(bodyText); } catch { return errorResponse("Invalid form data", 400, request); }
  const entities = await env.DB.prepare("SELECT code FROM org_entities WHERE is_active = 1").all<{ code: string }>();
  const { form, errors } = validateTeamForm(body, entities.results.map(e => e.code));
  if (errors.length) return jsonResponse({ valid: false, errors }, commit ? 400 : 200, request);
  const contentHash = await sha256(JSON.stringify(form));
  // A blank workbook may be distributed to several teams. Their named copies
  // have separate identities; the same team's retry remains idempotent.
  const formKey = await sha256(JSON.stringify([form.id, form.team.toLowerCase()]));
  const existing = await env.DB.prepare("SELECT content_hash FROM team_forms WHERE id = ?").bind(formKey).first<{ content_hash: string }>();
  if (existing) {
    if (existing.content_hash !== contentHash) return jsonResponse({ valid: false, errors: [{ location: "Workbook", message: "This workbook was already saved with different content. No records were changed. Ask the report officer to reconcile the original; do not change its ID to bypass this check." }] }, commit ? 409 : 200, request);
    return jsonResponse({ valid: true, duplicate: true, saved: commit, form, errors: [] }, 200, request);
  }
  const keys = await observationKeys(form);
  for (let start = 0; start < keys.length; start += 80) {
    const chunk = keys.slice(start, start + 80);
    const matches = await env.DB.prepare(`SELECT form_id FROM team_form_observations WHERE observation_key IN (${chunk.map(() => "?").join(",")}) LIMIT 1`).bind(...chunk).first<{ form_id: string }>();
    if (matches) return jsonResponse({ valid: false, errors: [{ location: "Workbook", message: "A room/date or device/date is already recorded for this quarter in another workbook. Reconcile overlapping team forms before importing; nothing has been saved." }] }, commit ? 409 : 200, request);
  }
  const warnings = form.rooms.some(r => Number(r.date.slice(0, 4)) !== form.year || Math.ceil(Number(r.date.slice(5, 7)) / 3) !== form.quarter)
    ? ["Visit dates fall outside the reporting quarter. They will retain their actual dates and appear in this quarter's separate team-exercise section."] : [];
  if (!commit) return jsonResponse({ valid: true, duplicate: false, form, warnings, errors: [] }, 200, request);
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO team_forms (id, year, quarter, team, payload, content_hash, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(formKey, form.year, form.quarter, form.team, JSON.stringify(form), contentHash, session.technician_id),
      env.DB.prepare("INSERT INTO team_form_observations (observation_key, form_id) SELECT value, ? FROM json_each(?)")
        .bind(formKey, JSON.stringify(keys)),
    ]);
  } catch (error) {
    // A simultaneous identical replay is successful; all other conflicts stay atomic.
    const replay = await env.DB.prepare("SELECT content_hash FROM team_forms WHERE id = ?").bind(formKey).first<{ content_hash: string }>();
    if (replay?.content_hash === contentHash) return jsonResponse({ valid: true, duplicate: true, saved: true, form, errors: [] }, 200, request);
    if (String(error).includes("UNIQUE")) return errorResponse("Another upload recorded this workbook or observation. Nothing from this upload was saved. Preview again.", 409, request);
    throw error;
  }
  return jsonResponse({ valid: true, saved: true, duplicate: false, form, warnings, errors: [] }, 201, request);
}
