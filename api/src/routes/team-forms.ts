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
  const existing = await env.DB.prepare("SELECT content_hash, year, quarter FROM team_forms WHERE id = ?").bind(formKey).first<{ content_hash: string; year: number; quarter: number }>();
  const revision = !!existing && existing.content_hash !== contentHash;
  const expectedHash = body && typeof body === "object" && "expectedHash" in body ? body.expectedHash : undefined;
  if (existing && !revision) {
    return jsonResponse({ valid: true, duplicate: true, saved: commit, form, errors: [] }, 200, request);
  }
  if (revision) {
    if (!["admin", "lead"].includes(session.role)) return errorResponse("Only a report lead or administrator can revise a saved return", 403, request);
    if (existing.year !== form.year || existing.quarter !== form.quarter) return errorResponse("A revision cannot change the reporting period", 409, request);
    const available = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'team_form_revisions'").first();
    if (!available) return errorResponse("Apply the team-form revisions migration before revising returns", 503, request);
    if (commit && expectedHash !== existing.content_hash) return errorResponse("The saved return changed or was not previewed. Preview again before replacing it.", 409, request);
  }
  const keys = await observationKeys(form);
  for (let start = 0; start < keys.length; start += 80) {
    const chunk = keys.slice(start, start + 80);
    const matches = await env.DB.prepare(`SELECT form_id FROM team_form_observations WHERE form_id <> ? AND observation_key IN (${chunk.map(() => "?").join(",")}) LIMIT 1`).bind(formKey, ...chunk).first<{ form_id: string }>();
    if (matches) return jsonResponse({ valid: false, errors: [{ location: "Workbook", message: "A room/date or device/date is already recorded for this quarter in another workbook. Reconcile overlapping team forms before importing; nothing has been saved." }] }, commit ? 409 : 200, request);
  }
  const warnings = form.rooms.some(r => Number(r.date.slice(0, 4)) !== form.year || Math.ceil(Number(r.date.slice(5, 7)) / 3) !== form.quarter)
    ? ["Visit dates fall outside the reporting quarter. They will retain their actual dates and appear in this quarter's separate team-exercise section."] : [];
  if (revision) warnings.push("This revision replaces the saved team return. The previous version is retained in revision history. Existing generated reports remain unchanged.");
  if (!commit) return jsonResponse({ valid: true, duplicate: false, revision, expectedHash: existing?.content_hash, form, warnings, errors: [] }, 200, request);
  try {
    if (revision && existing) {
      const revisionId = crypto.randomUUID();
      // The first statement deliberately violates NOT NULL on a stale hash,
      // rolling back the entire D1 batch rather than overwriting a newer return.
      await env.DB.batch([
        env.DB.prepare("INSERT INTO team_form_revisions (id, form_id, payload, content_hash, revised_by) VALUES (?, ?, (SELECT payload FROM team_forms WHERE id = ? AND content_hash = ?), ?, ?)")
          .bind(revisionId, formKey, formKey, existing.content_hash, existing.content_hash, session.technician_id),
        env.DB.prepare("DELETE FROM team_form_observations WHERE form_id = ?").bind(formKey),
        env.DB.prepare("UPDATE team_forms SET payload = ?, content_hash = ?, uploaded_by = ? WHERE id = ? AND content_hash = ?")
          .bind(JSON.stringify(form), contentHash, session.technician_id, formKey, existing.content_hash),
        env.DB.prepare("INSERT INTO team_form_observations (observation_key, form_id) SELECT value, ? FROM json_each(?)")
          .bind(formKey, JSON.stringify(keys)),
      ]);
      return jsonResponse({ valid: true, saved: true, revision: true, duplicate: false, form, warnings, errors: [] }, 200, request);
    }
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
    if (/UNIQUE|NOT NULL/.test(String(error))) return errorResponse("Another upload changed this workbook or observation. Nothing from this upload was saved. Preview again.", 409, request);
    throw error;
  }
  return jsonResponse({ valid: true, saved: true, duplicate: false, form, warnings, errors: [] }, 201, request);
}
