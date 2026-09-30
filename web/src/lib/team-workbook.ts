import { Workbook, type Worksheet, type Cell } from "exceljs";
import type { TeamForm, FormRoom, FormDevice } from "./team-form-types";

const ROOM_HEADERS = ["Directorate code", "Room", "Visit date", "Visit mode", "Visit status", "Notes / access reason"];
const DEVICE_HEADERS = ["Directorate code", "Room", "Visit date", "Asset tag / serial", "Device type", "Make / model", "Condition before", "Checks performed", "Work carried out", "Condition after", "Final test / reason not tested", "Outstanding issue", "Recommendation / parts", "Officer performing check"];
const ROOM_KEYS: (keyof FormRoom)[] = ["entity", "room", "date", "mode", "status", "notes"];
const DEVICE_KEYS: (keyof FormDevice)[] = ["entity", "room", "date", "reference", "type", "makeModel", "before", "checks", "work", "after", "finalTest", "outstanding", "recommendation", "officer"];
const CONDITIONS = '"functional,limited,nonfunctional,not_tested"';
export interface ExportOptions {
  year: number; quarter: number; team: string; members: string;
  entities: { code: string; name: string }[];
  rooms?: Partial<FormRoom>[];
}

function sheet(workbook: Workbook, name: string, headers: string[], widths: number[], blankRows: number): Worksheet {
  const ws = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }], pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: name === "Devices" ? 2 : 1, fitToHeight: 0 } });
  ws.addRow(headers);
  widths.forEach((width, i) => { ws.getColumn(i + 1).width = width; ws.getColumn(i + 1).numFmt = "@"; });
  for (let row = 1; row <= blankRows + 1; row++) {
    ws.getRow(row).height = row === 1 ? 36 : 48;
    headers.forEach((_, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.font = { name: "Arial", size: 10, color: { argb: row === 1 ? "FFFFFFFF" : "FF17365D" }, bold: row === 1 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row === 1 ? "FF1A4D2E" : "FFFFF8E7" } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD4C9A8" } } };
    });
  }
  ws.pageSetup.printTitlesRow = "1:1";
  ws.autoFilter = { from: "A1", to: { row: blankRows + 1, column: headers.length } };
  return ws;
}
function dropdown(ws: Worksheet, column: number, values: string, count: number) {
  for (let row = 2; row <= count + 1; row++) ws.getCell(row, column).dataValidation = {
    type: "list", allowBlank: true, formulae: [values], showErrorMessage: true,
    errorTitle: "Select a listed value", error: "Use the dropdown value so ITEMS can read the form.", errorStyle: "stop",
  };
}

export async function createTeamWorkbook(options: ExportOptions): Promise<Uint8Array> {
  const wb = new Workbook();
  wb.creator = "OHCS RSIMD-ITEMS";
  const guide = sheet(wb, "Instructions", ["OHCS TEAM MAINTENANCE FORM", "How to complete"], [34, 105], 0);
  [
    ["1. Team", "Complete team members and observations. Give each team a distinct name if sharing copies of this blank form. Quarter is the reporting quarter, not necessarily the visit quarter. Do not edit the workbook ID."],
    ["2. Rooms", "One row per room per visit date. Use a Directorate code from Directory. Record inaccessible rooms too. Fill the cream cells; keep headers and sheet names unchanged."],
    ["3. Devices", "One row per device per visit date, including working PCs/printers. Use a unique asset tag or serial number, not just 'PC 1'. Devices must match a visited/revisit row on Rooms."],
    ["4. Results", "functional = tested and working; limited = works with limitations; nonfunctional = not working; not_tested = no reliable test. Never assume a pass."],
    ["5. Checks", "PC: boot, peripherals, network, updates/security, storage and power. Printer: connection, queue, paper feed, consumables and test page. State which checks actually happened; do not tick off unperformed work."],
    ["6. Upload", "Save as .xlsx. In ITEMS choose Team forms > Preview upload, check quarter/dates and errors, then Save records. A repeated identical upload is safe. Changed saved forms require reconciliation, not a new ID."],
    ["7. Limits", "Up to 50 room rows and 100 device rows; maximum 2 MB file. No formulas, hyperlinks or macros in input cells. Delete unused empty rows only if desired."],
    ["8. Evidence", "No passwords, PINs or confidential document contents. Named team/checking officers describe the work; ITEMS records the uploading account separately."],
    ["9. Printing", "Sheets are printable. If filled on paper, enter the answers into this workbook before uploading; scanned handwriting is not automatically imported."],
    ["EXAMPLE ONLY — not imported", "Room: RSIMD | 19 | 2026-10-01 | on_site | visited. Device: EXAMPLE-SERIAL-001 | desktop | limited → functional | checked boot/network | replaced network cable | final test: shared drive opened. Use your actual directory code and observations."],
  ].forEach(row => { const added = guide.addRow(row); added.height = 50; added.eachCell(c => { c.font = { name: "Arial", size: 11 }; c.alignment = { wrapText: true, vertical: "top" }; }); });
  const team = sheet(wb, "Team", ["Field (do not rename)", "Value"], [35, 100], 10);
  const metadata = [
    ["Schema version", "1"], ["Workbook ID", crypto.randomUUID()], ["Reporting year", String(options.year)],
    ["Reporting quarter", String(options.quarter)], ["Team name", options.team], ["Participating officers", options.members],
    ["Challenges", ""], ["Recommendations", ""], ["Helpdesk observations (optional)", ""],
  ];
  metadata.forEach((row, i) => { team.getCell(i + 2, 1).value = row[0]!; team.getCell(i + 2, 2).value = row[1]!; });
  for (const row of [2, 3]) team.getCell(row, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
  const rooms = sheet(wb, "Rooms", ROOM_HEADERS, [22, 12, 16, 18, 18, 65], 50);
  (options.rooms ?? []).slice(0, 50).forEach((r, i) => ROOM_KEYS.forEach((key, col) => { rooms.getCell(i + 2, col + 1).value = r[key] ?? ""; }));
  dropdown(rooms, 4, '"on_site,remote,hybrid"', 50);
  dropdown(rooms, 5, '"visited,inaccessible,revisit"', 50);
  const devices = sheet(wb, "Devices", DEVICE_HEADERS, [20, 10, 16, 26, 18, 24, 20, 38, 38, 20, 38, 38, 38, 25], 100);
  dropdown(devices, 5, '"desktop,laptop,printer,scanner,cctv,clock_in,network,ups,other"', 100);
  dropdown(devices, 7, CONDITIONS, 100); dropdown(devices, 10, CONDITIONS, 100);
  const directory = sheet(wb, "Directory", ["Directorate code", "Name"], [25, 85], 0);
  options.entities.forEach(e => directory.addRow([e.code, e.name]));
  directory.eachRow(row => row.eachCell(c => { c.font = { ...c.font, name: "Arial", size: 11 }; }));
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

function textCell(cell: Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  throw new Error(`${cell.worksheet.name}!${cell.address}: use plain text, not formulas, links or embedded objects.`);
}
function checkZip(data: ArrayBuffer): void {
  if (data.byteLength > 2_000_000 || data.byteLength < 22) throw new Error("Use an ITEMS .xlsx workbook no larger than 2 MB.");
  const view = new DataView(data);
  let end = -1;
  for (let i = data.byteLength - 22; i >= Math.max(0, data.byteLength - 65557); i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("Invalid XLSX archive.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true), expanded = 0;
  if (count > 100 || count === 0) throw new Error("Workbook has too many internal files.");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > data.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error("Unsupported XLSX archive.");
    expanded += view.getUint32(offset + 24, true);
    const length = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(new Uint8Array(data, offset + 46, length)).toLowerCase();
    if (name.includes("vbaproject") || name.includes("externallinks")) throw new Error("Macros and external workbook links are not accepted.");
    offset += 46 + length + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  if (expanded > 15_000_000) throw new Error("Expanded workbook is too large. Use a fresh ITEMS form.");
}

export async function parseTeamWorkbook(data: ArrayBuffer): Promise<TeamForm> {
  checkZip(data);
  const wb = new Workbook();
  await wb.xlsx.load(data);
  const team = wb.getWorksheet("Team");
  if (!team) throw new Error("Missing Team sheet. Use a downloaded ITEMS form.");
  if (team.rowCount > 100 || team.columnCount > 2) throw new Error("Team: use the labelled fields only.");
  for (let row = 11; row <= team.rowCount; row++) {
    if (textCell(team.getCell(row, 1)) || textCell(team.getCell(row, 2))) throw new Error("Team: move additional notes into Challenges, Recommendations or Helpdesk observations.");
  }
  const expected = ["Schema version", "Workbook ID", "Reporting year", "Reporting quarter", "Team name", "Participating officers", "Challenges", "Recommendations", "Helpdesk observations (optional)"];
  expected.forEach((label, i) => { if (textCell(team.getCell(i + 2, 1)) !== label) throw new Error(`Team row ${i + 2}: restore the original field label.`); });
  function rows(name: string, headers: string[], max: number): string[][] {
    const ws = wb.getWorksheet(name);
    if (!ws) throw new Error(`Missing ${name} sheet.`);
    if (ws.rowCount > 501 || ws.columnCount > headers.length) throw new Error(`${name}: unexpected extra rows or columns. Use the original template.`);
    headers.forEach((header, i) => { if (textCell(ws.getCell(1, i + 1)) !== header) throw new Error(`${name}: keep the original column headers.`); });
    const output: string[][] = [];
    for (let n = 2; n <= ws.rowCount; n++) {
      const values = headers.map((_, i) => textCell(ws.getCell(n, i + 1)));
      if (values.some(Boolean)) {
        if (n > max + 1) throw new Error(`${name}: data is outside the ${max} template rows.`);
        // Preserve row numbers in validation errors; gaps are not silently compacted.
        output[n - 2] = values;
      }
    }
    if (output.some(v => !v)) throw new Error(`${name}: keep completed rows together, without blank rows between them.`);
    for (let i = 0; i < output.length; i++) if (!output[i]) throw new Error(`${name}: move completed rows together without blank gaps.`);
    return output;
  }
  const roomRows = rows("Rooms", ROOM_HEADERS, 50), deviceRows = rows("Devices", DEVICE_HEADERS, 100);
  const get = (n: number) => textCell(team.getCell(n, 2));
  return {
    version: Number(get(2)), id: get(3), year: Number(get(4)), quarter: Number(get(5)), team: get(6), members: get(7),
    challenges: get(8), recommendations: get(9), helpdesk: get(10),
    rooms: roomRows.map(row => Object.fromEntries(ROOM_KEYS.map((key, i) => [key, row[i] ?? ""])) as unknown as FormRoom),
    devices: deviceRows.map(row => Object.fromEntries(DEVICE_KEYS.map((key, i) => [key, row[i] ?? ""])) as unknown as FormDevice),
  };
}
