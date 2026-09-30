export const FORM_VERSION = 1;
export const MAX_DEVICES = 100;
export const MAX_ROOMS = 50;
const outcomes = ["functional", "limited", "nonfunctional", "not_tested"];
const deviceTypes = ["desktop", "laptop", "printer", "scanner", "cctv", "clock_in", "network", "ups", "other"];

export interface FormRoom {
  entity: string; room: string; date: string; mode: string; status: string; notes: string;
}
export interface FormDevice {
  entity: string; room: string; date: string; reference: string; type: string;
  makeModel: string; before: string; checks: string; work: string; after: string;
  finalTest: string; outstanding: string; recommendation: string; officer: string;
}
export interface TeamForm {
  version: number; id: string; year: number; quarter: number; team: string; members: string;
  challenges: string; recommendations: string; helpdesk: string;
  rooms: FormRoom[]; devices: FormDevice[];
}
export interface FormIssue { location: string; message: string }

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateTeamForm(input: unknown, entityCodes: string[]): { form: TeamForm; errors: FormIssue[] } {
  const source = record(input);
  const errors: FormIssue[] = [];
  const fail = (location: string, message: string) => errors.push({ location, message });
  const str = (obj: Record<string, unknown>, key: string, location: string, required = false, max = 1000): string => {
    const raw = obj[key];
    if (raw !== undefined && typeof raw !== "string") fail(location, `${key} must be text`);
    const value = typeof raw === "string" ? raw.trim().replace(/\r\n/g, "\n") : "";
    if (required && !value) fail(location, `${key} is required`);
    if (value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) fail(location, `${key} is too long or contains invalid characters`);
    return value;
  };
  const form: TeamForm = {
    version: source.version as number, id: str(source, "id", "Team", true, 36),
    year: source.year as number, quarter: source.quarter as number,
    team: str(source, "team", "Team", true, 120), members: str(source, "members", "Team", true),
    challenges: str(source, "challenges", "Team", false, 4000),
    recommendations: str(source, "recommendations", "Team", false, 4000),
    helpdesk: str(source, "helpdesk", "Team", false, 4000), rooms: [], devices: [],
  };
  if (form.version !== FORM_VERSION) fail("Team", "Unsupported workbook version; download a fresh form");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.id)) fail("Team", "Invalid workbook ID; download a fresh form");
  if (!Number.isInteger(form.year) || form.year < 2000 || form.year > 2100) fail("Team", "Year must be 2000-2100");
  if (!Number.isInteger(form.quarter) || form.quarter < 1 || form.quarter > 4) fail("Team", "Quarter must be 1-4");
  if (!Array.isArray(source.rooms) || source.rooms.length === 0 || source.rooms.length > MAX_ROOMS) fail("Rooms", `Provide 1-${MAX_ROOMS} room visits`);
  if (!Array.isArray(source.devices) || source.devices.length > MAX_DEVICES) fail("Devices", `Maximum ${MAX_DEVICES} device records`);
  const codes = new Set(entityCodes.map(c => c.toUpperCase()));
  const roomKeys = new Set<string>();
  const dateFields = (row: Record<string, unknown>, loc: string) => {
    const entity = str(row, "entity", loc, true, 40).toUpperCase();
    const room = str(row, "room", loc, true, 80).toUpperCase();
    const date = str(row, "date", loc, true, 10);
    if (!codes.has(entity)) fail(loc, `Unknown or inactive directorate/unit code: ${entity}`);
    if (!validDate(date)) fail(loc, "Visit date must be a real YYYY-MM-DD date");
    return { entity, room, date };
  };
  for (const [i, value] of (Array.isArray(source.rooms) ? source.rooms.slice(0, MAX_ROOMS) : []).entries()) {
    const row = record(value), loc = `Rooms row ${i + 2}`;
    const r: FormRoom = { ...dateFields(row, loc), mode: str(row, "mode", loc, true, 20), status: str(row, "status", loc, true, 20), notes: str(row, "notes", loc) };
    if (!["on_site", "remote", "hybrid"].includes(r.mode)) fail(loc, "Mode must be on_site, remote or hybrid");
    if (!["visited", "inaccessible", "revisit"].includes(r.status)) fail(loc, "Status must be visited, inaccessible or revisit");
    if (r.status !== "visited" && !r.notes) fail(loc, "Explain why the room is inaccessible or needs a revisit");
    const key = JSON.stringify([r.entity, r.room, r.date]);
    if (roomKeys.has(key)) fail(loc, "Duplicate room/date in this workbook");
    roomKeys.add(key); form.rooms.push(r);
  }
  const deviceKeys = new Set<string>();
  for (const [i, value] of (Array.isArray(source.devices) ? source.devices.slice(0, MAX_DEVICES) : []).entries()) {
    const row = record(value), loc = `Devices row ${i + 2}`;
    const d: FormDevice = {
      ...dateFields(row, loc), reference: str(row, "reference", loc, true, 120).toUpperCase(),
      type: str(row, "type", loc, true, 20), makeModel: str(row, "makeModel", loc, false, 150),
      before: str(row, "before", loc, true, 20), checks: str(row, "checks", loc, true), work: str(row, "work", loc),
      after: str(row, "after", loc, true, 20), finalTest: str(row, "finalTest", loc, true),
      outstanding: str(row, "outstanding", loc), recommendation: str(row, "recommendation", loc),
      officer: str(row, "officer", loc, true, 150),
    };
    if (!deviceTypes.includes(d.type)) fail(loc, "Select a supported device type from the workbook list");
    if (!outcomes.includes(d.before) || !outcomes.includes(d.after)) fail(loc, "Condition must be functional, limited, nonfunctional or not_tested");
    if (d.after !== "functional" && !d.outstanding) fail(loc, "Record the outstanding issue or why testing was not possible");
    const room = form.rooms.find(r => r.entity === d.entity && r.room === d.room && r.date === d.date);
    if (!room || room.status === "inaccessible") fail(loc, "Device must belong to a visited/revisit room with the same date on Rooms");
    const key = JSON.stringify([d.reference, d.date]);
    if (deviceKeys.has(key)) fail(loc, "Duplicate device reference/date in this workbook");
    deviceKeys.add(key); form.devices.push(d);
  }
  // Sorting gives semantically identical reuploads the same digest, even after Excel sorting.
  form.rooms.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  form.devices.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { form, errors };
}

export async function sha256(text: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), b => b.toString(16).padStart(2, "0")).join("");
}
export async function observationKeys(form: TeamForm): Promise<string[]> {
  return Promise.all([
    ...form.rooms.map(r => ["room", r.entity, r.room, r.date]),
    ...form.devices.map(d => ["device", d.reference, d.date]),
  ].map(key => sha256(JSON.stringify(key))));
}
export async function teamFormsAvailable(db: D1Database): Promise<boolean> {
  const row = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'team_forms'").first();
  return !!row;
}
export async function getTeamForms(db: D1Database, year: number, quarter: number): Promise<TeamForm[]> {
  if (!await teamFormsAvailable(db)) return [];
  const result = await db.prepare("SELECT payload FROM team_forms WHERE year = ? AND quarter = ? ORDER BY created_at, id").bind(year, quarter).all<{ payload: string }>();
  return result.results.map(row => JSON.parse(row.payload) as TeamForm);
}
