import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, PageBreak, Footer, PageNumber } from "docx";
import JSZip from "jszip";
import type { ExportOptions } from "./team-workbook";
import type { TeamForm, FormRoom, FormDevice } from "./team-form-types";

const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const ROOM_FIELDS = { entity: "Office / directorate code", room: "Room number", date: "Date of visit (YYYY-MM-DD)", mode: "How did you assist?", status: "Was the room visited?", notes: "Room notes / reason access was not possible" };
const DEVICE_FIELDS = { entity: "Office / directorate code", room: "Room number", date: "Date of visit (YYYY-MM-DD)", reference: "Asset tag or serial number", type: "Type of equipment", makeModel: "Brand and model (if known)", before: "Was it working before the visit?", checks: "What did you check?", work: "What did you do or fix?", after: "Is it working after your work?", finalTest: "How did you confirm the result?", outstanding: "What problem remains?", recommendation: "What is needed next?", officer: "Name of officer who checked it" };
const CONDITIONS: Record<string, string> = { working: "functional", "working with a problem": "limited", "not working": "nonfunctional", "not checked": "not_tested" };
const MODES: Record<string, string> = { "in person": "on_site", remotely: "remote", both: "hybrid" };
const STATUSES: Record<string, string> = { yes: "visited", "no access": "inaccessible", "return visit needed": "revisit" };
const TYPES: Record<string, string> = { "desktop computer": "desktop", laptop: "laptop", printer: "printer", scanner: "scanner", cctv: "cctv", "clock-in device": "clock_in", "network equipment": "network", ups: "ups", other: "other" };
const p = (text: string, bold = false, size = 22) => new Paragraph({ spacing: { after: 90 }, children: [new TextRun({ text, bold, size, font: "Arial" })] });
function table(title: string, values: [string, string][], answerHeight = 340) {
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3360, 6000], rows: [
    new TableRow({ tableHeader: true, children: [new TableCell({ columnSpan: 2, width: { size: 9360, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: "1A4D2E" }, children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, color: "FFFFFF", font: "Arial", size: 24 })] })] })] }),
    ...values.map(([label, value]) => new TableRow({ cantSplit: true, height: { value: answerHeight, rule: "atLeast" }, children: [
      new TableCell({ width: { size: 3360, type: WidthType.DXA }, margins: { top: 65, bottom: 65, left: 100, right: 100 }, children: [p(label, true, 20)] }),
      new TableCell({ width: { size: 6000, type: WidthType.DXA }, margins: { top: 65, bottom: 65, left: 100, right: 100 }, shading: { type: ShadingType.CLEAR, fill: "FFF8E7" }, children: value.split(/\r?\n/).map(line => p(line, false, 22)) }),
    ] })),
  ] });
}
const nextPage = () => new Paragraph({ children: [new PageBreak()] });

export async function createTeamWord(options: ExportOptions & { devicePages?: number }): Promise<Uint8Array> {
  const count = options.devicePages ?? 3;
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error("Choose 1–100 device pages.");
  if ((options.rooms?.length ?? 0) > 50) throw new Error("Use up to 50 rooms per form.");
  const children: (Paragraph | Table)[] = [p("OFFICE OF THE HEAD OF CIVIL SERVICE", true, 26), p("RSIMD • Team maintenance form", true, 32),
    p(`Q${options.quarter} ${options.year} | Record the actual day you visit each room.`),
    table("TEAM DETAILS", [["Team name", options.team], ["Participating officers", options.members], ["Reporting year", String(options.year)], ["Reporting quarter", String(options.quarter)], ["Form reference (do not change)", crypto.randomUUID()], ["Form version (do not change)", "1"]]),
    p("How to complete this form", true, 26),
    p("1. Type in the cream answer boxes. Keep the questions and table headings. You can write normal sentences; no technical language is needed."),
    p("2. Complete a room visit table for every room. Complete one device page for each computer or printer checked, including those already working. Copy a whole room table or device table if you need more."),
    p("3. Ask the officer doing the check to explain what was tested, what was done and whether it worked afterwards. Do not guess a result. If you could not test it, write Not checked and explain why."),
    p("4. Save as .docx. In ITEMS, upload it under Team forms, check the preview and select Save records. Keep the saved Word file. Printed/handwritten copies must be typed into the Word form before upload."),
    p("Do not include passwords, PINs or the contents of confidential files. The form reference links this return to your team; do not edit it."),
    nextPage(), p("A filled example — read this first", true, 30), p("EXAMPLE ONLY. This page is a guide and is never imported."),
    table("EXAMPLE — DO NOT COMPLETE", [["Office / room / date", "RSIMD / Room 19 / 2026-10-01"], ["Equipment", "Desktop computer, serial EXAMPLE-001"], ["Before", "Working with a problem"], ["What did you check?", "The computer started, but it could not connect to the office network."], ["What did you do or fix?", "Replaced the loose network cable."], ["After", "Working"], ["How did you confirm the result?", "Opened the shared office folder successfully."], ["What problem remains?", "None"], ["What is needed next?", "None"], ["Officer", "Name of the officer who performed the check"]]),
    p("Useful words", true, 26), p("Equipment type: Desktop computer / Laptop / Printer / Scanner / CCTV / Clock-in device / Network equipment / UPS / Other."), p("Condition: Working / Working with a problem / Not working / Not checked."),
    p("A printer example: printed a test page, cleared a paper jam, then printed again. If it still does not print, record the problem and what is needed next."),
    p("Dates: use year-month-day, for example 2026-10-01. The October visit can still belong to the Q3 reporting exercise."),
  ];
  const rooms = options.rooms?.length ? options.rooms : [{}];
  rooms.forEach((room, i) => children.push(nextPage(), p(`Room visit ${i + 1}`, true, 28), p(`Team: ${options.team} | Officers: ${options.members}`),
    p("How did you assist? Write In person, Remotely or Both. Was the room visited? Write Yes, No access or Return visit needed. Explain any access problem or return visit."),
    table("ROOM VISIT", Object.entries(ROOM_FIELDS).map(([key, label]) => [label, room[key as keyof FormRoom] ?? ""]), 520)));
  for (let i = 0; i < count; i++) {
    const room = rooms.length === 1 ? rooms[0]! : {};
    children.push(nextPage(), p(`Device check ${i + 1}`, true, 28), p(`Team: ${options.team} | Officers: ${options.members}`),
      p("One device per table. Condition: Working / Working with a problem / Not working / Not checked. For an unused page, leave all device answers blank; prefilled location alone is ignored.", false, 20),
      table("DEVICE CHECK", Object.entries(DEVICE_FIELDS).map(([key, label]) => [label, ["entity", "room", "date"].includes(key) ? room[key as keyof FormRoom] ?? "" : ""]), 350));
  }
  children.push(nextPage(), p("Team observations", true, 28), table("TEAM OBSERVATIONS", [["Challenges encountered", ""], ["Recommendations for the report", ""], ["Other staff requests (optional)", ""]], 850),
    p("Office / directorate codes", true, 26), p("Use the code shown beside your office name in each room/device table."),
    ...options.entities.map(e => p(`${e.code} — ${e.name}`, false, 20)));
  return new Uint8Array(await Packer.toArrayBuffer(new Document({ creator: "OHCS RSIMD-ITEMS", title: `Q${options.quarter} ${options.year} team maintenance form`,
    styles: { default: { document: { run: { font: "Arial", size: 22 }, paragraph: { spacing: { after: 90 } } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1273, right: 1273 } } },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun(`OHCS RSIMD | Q${options.quarter} ${options.year} | Page `), new TextRun({ children: [PageNumber.CURRENT] })] })] }) }, children }] })));
}

function validateArchive(data: ArrayBuffer) {
  if (data.byteLength < 22 || data.byteLength > 2_000_000) throw new Error("Choose an ITEMS Word form no larger than 2 MB.");
  const view = new DataView(data);
  let end = -1;
  for (let i = data.byteLength - 22; i >= Math.max(0, data.byteLength - 65557); i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("This is not a valid Word file. Save it as .docx.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true), expanded = 0;
  if (!count || count > 150) throw new Error("Word file contains too many attachments. Use the original form.");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > data.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error("Unsupported Word archive.");
    expanded += view.getUint32(offset + 24, true);
    const length = view.getUint16(offset + 28, true);
    if (offset + 46 + length > data.byteLength) throw new Error("Incomplete Word archive.");
    const name = new TextDecoder().decode(new Uint8Array(data, offset + 46, length)).toLowerCase();
    if (/vbaproject|embeddings\/|activex\//.test(name)) throw new Error("Macros and embedded files are not accepted.");
    offset += 46 + length + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  if (expanded > 15_000_000) throw new Error("Expanded Word file is too large. Remove images/attachments.");
}

export async function parseTeamWord(data: ArrayBuffer): Promise<TeamForm> {
  validateArchive(data);
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Use the Word form downloaded from ITEMS.");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("Word file is damaged. Save a fresh .docx copy.");
  for (const tag of ["ins", "del", "moveFrom", "moveTo", "altChunk", "object", "fldSimple", "instrText"]) if (document.getElementsByTagNameNS(NS, tag).length) throw new Error("Accept tracked changes and remove embedded fields before uploading.");
  const direct = (el: Element, tag: string) => Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1 && (n as Element).localName === tag && (n as Element).namespaceURI === NS);
  const text = (el: Element) => Array.from(el.getElementsByTagNameNS(NS, "p")).map(para => Array.from(para.getElementsByTagNameNS(NS, "t")).map(t => t.textContent ?? "").join("")).join("\n").trim();
  const collected = new Map<string, Record<string, string>[]>();
  const expected: Record<string, string[]> = {
    "TEAM DETAILS": ["Team name", "Participating officers", "Reporting year", "Reporting quarter", "Form reference (do not change)", "Form version (do not change)"],
    "ROOM VISIT": Object.values(ROOM_FIELDS), "DEVICE CHECK": Object.values(DEVICE_FIELDS),
    "TEAM OBSERVATIONS": ["Challenges encountered", "Recommendations for the report", "Other staff requests (optional)"],
  };
  for (const tbl of Array.from(document.getElementsByTagNameNS(NS, "tbl"))) {
    const rows = direct(tbl, "tr"), first = rows[0];
    if (!first) continue;
    const title = text(first).toUpperCase();
    if (title === "EXAMPLE — DO NOT COMPLETE") continue;
    if (!expected[title]) throw new Error("A form table heading was changed. Restore TEAM DETAILS, ROOM VISIT, DEVICE CHECK or TEAM OBSERVATIONS.");
    const record: Record<string, string> = {};
    for (const row of rows.slice(1)) {
      const cells = direct(row, "tc");
      if (cells.length !== 2) throw new Error(`${title}: keep the question and answer columns.`);
      const label = text(cells[0]!);
      if (!expected[title]!.includes(label) || label in record) throw new Error(`${title}: restore the original questions (a question is missing, repeated or renamed).`);
      record[label] = text(cells[1]!);
    }
    if (Object.keys(record).length !== expected[title]!.length) throw new Error(`${title}: a question was removed. Use a complete table.`);
    collected.set(title, [...(collected.get(title) ?? []), record]);
  }
  if (collected.get("TEAM DETAILS")?.length !== 1 || collected.get("TEAM OBSERVATIONS")?.length !== 1) throw new Error("Keep exactly one team-details and one team-observations table.");
  const team = collected.get("TEAM DETAILS")![0]!, notes = collected.get("TEAM OBSERVATIONS")![0]!;
  const mapped = <T extends object>(row: Record<string, string>, fields: Record<keyof T, string>): T => Object.fromEntries(Object.entries(fields).map(([key, label]) => [key, row[String(label)] ?? ""])) as T;
  const normalize = (value: string, choices: Record<string, string>) => choices[value.toLowerCase().trim()] ?? value.toLowerCase().trim();
  const rooms = (collected.get("ROOM VISIT") ?? []).map(r => mapped<FormRoom>(r, ROOM_FIELDS)).filter(r => Object.values(r).some(Boolean));
  rooms.forEach(r => { r.mode = normalize(r.mode, MODES); r.status = normalize(r.status, STATUSES); });
  const devices = (collected.get("DEVICE CHECK") ?? []).map(r => mapped<FormDevice>(r, DEVICE_FIELDS)).filter(r => Object.entries(r).some(([key, value]) => !["entity", "room", "date"].includes(key) && value));
  devices.forEach(d => { d.before = normalize(d.before, CONDITIONS); d.after = normalize(d.after, CONDITIONS); d.type = normalize(d.type, TYPES); });
  if (rooms.length > 50 || devices.length > 100) throw new Error("Use up to 50 rooms and 100 devices per form.");
  return { version: Number(team["Form version (do not change)"]), id: team["Form reference (do not change)"]!, year: Number(team["Reporting year"]), quarter: Number(team["Reporting quarter"]), team: team["Team name"]!, members: team["Participating officers"]!, challenges: notes["Challenges encountered"]!, recommendations: notes["Recommendations for the report"]!, helpdesk: notes["Other staff requests (optional)"]!, rooms, devices };
}
