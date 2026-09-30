import { afterEach, describe, expect, it, vi } from "vitest";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";
import { Workbook } from "exceljs";
import { createTeamWord, parseTeamWord } from "../../web/src/lib/team-word";
import { createTeamWorkbook } from "../../web/src/lib/team-workbook";
import { validateTeamForm } from "../src/services/team-form";

const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const options = { year: 2026, quarter: 3, team: "RSIMD & Administration", members: "Osborn, Test admin officer", entities: [{ code: "RSIMD", name: "RSIMD" }], rooms: [{ entity: "RSIMD", room: "19", date: "2026-10-01" }], devicePages: 2 };
const buffer = (bytes: Uint8Array) => new Uint8Array(bytes).buffer;
afterEach(() => vi.unstubAllGlobals());
async function fixture(fill = false) {
  vi.stubGlobal("DOMParser", DOMParser);
  const zip = await JSZip.loadAsync(await createTeamWord(options));
  const doc = new DOMParser().parseFromString(await zip.file("word/document.xml")!.async("string"), "application/xml");
  const tables = Array.from(doc.getElementsByTagNameNS(NS, "tbl"));
  const select = (name: string) => tables.filter(t => t.getElementsByTagNameNS(NS, "tr")[0]!.textContent === name);
  const set = (name: string, label: string, value: string, index = 0) => {
    const tbl = select(name)[index]!;
    const row = Array.from(tbl.getElementsByTagNameNS(NS, "tr")).find(r => r.getElementsByTagNameNS(NS, "tc")[0]!.textContent === label)!;
    const cell = row.getElementsByTagNameNS(NS, "tc")[1]!;
    const paras = cell.getElementsByTagNameNS(NS, "p");
    const para = paras[0]!;
    while (para.firstChild) para.removeChild(para.firstChild);
    // Simulates Word splitting entered text into multiple runs after formatting.
    for (const text of [value.slice(0, 3), value.slice(3)]) {
      const run = doc.createElementNS(NS, "w:r"), t = doc.createElementNS(NS, "w:t");
      t.appendChild(doc.createTextNode(text)); run.appendChild(t); para.appendChild(run);
    }
  };
  if (fill) {
    set("ROOM VISIT", "How did you assist?", "In person"); set("ROOM VISIT", "Was the room visited?", "Yes");
    for (const [label, value] of Object.entries({ "Asset tag or serial number": "TEST-PC-001", "Type of equipment": "Desktop computer", "Was it working before the visit?": "Working with a problem", "What did you check?": "Computer started but could not connect", "What did you do or fix?": "Replaced cable", "Is it working after your work?": "Working", "How did you confirm the result?": "Opened shared folder", "Name of officer who checked it": "Test IT officer" })) set("DEVICE CHECK", label, value);
  }
  return { zip, doc, select, set, bytes: async () => { zip.file("word/document.xml", new XMLSerializer().serializeToString(doc)); return buffer(await zip.generateAsync({ type: "uint8array" })); } };
}
describe("plain-language Word maintenance forms", () => {
  it("preserves team details, Q3 and October dates; example and unused device pages are excluded", async () => {
    const f = await fixture(); const form = await parseTeamWord(await f.bytes());
    expect(form.team).toBe(options.team); expect(form.members).toBe(options.members);
    expect(form.quarter).toBe(3); expect(form.rooms[0]?.date).toBe("2026-10-01"); expect(form.devices).toEqual([]);
    expect(f.doc.documentElement.textContent).toContain("A filled example");
  });
  it("converts completed everyday answers into validated report data, including split Word runs", async () => {
    const f = await fixture(true); const form = await parseTeamWord(await f.bytes());
    expect(validateTeamForm(form, ["RSIMD"]).errors).toEqual([]);
    expect(form.devices).toHaveLength(1); expect(form.devices[0]?.before).toBe("limited"); expect(form.devices[0]?.after).toBe("functional");
    expect(form.devices[0]?.checks).toBe("Computer started but could not connect");
  });
  it("retains partially completed device pages for validation rather than silently discarding them", async () => {
    const f = await fixture(); f.set("DEVICE CHECK", "What did you check?", "Printer did not switch on");
    const form = await parseTeamWord(await f.bytes()); expect(form.devices).toHaveLength(1); expect(validateTeamForm(form, ["RSIMD"]).errors.length).toBeGreaterThan(0);
  });
  it("supports copied whole device tables", async () => {
    const f = await fixture(true); const original = f.select("DEVICE CHECK")[0]!;
    original.parentNode!.appendChild(original.cloneNode(true));
    const form = await parseTeamWord(await f.bytes()); expect(form.devices).toHaveLength(2);
    expect(validateTeamForm(form, ["RSIMD"]).errors.some(e => e.message.includes("Duplicate device"))).toBe(true);
  });
  it("rejects damaged questions and missing team metadata", async () => {
    const f = await fixture(); const team = f.select("TEAM DETAILS")[0]!;
    team.parentNode!.removeChild(team); await expect(parseTeamWord(await f.bytes())).rejects.toThrow("exactly one");
    const g = await fixture(); g.select("ROOM VISIT")[0]!.getElementsByTagNameNS(NS, "t")[1]!.textContent = "Renamed question";
    await expect(parseTeamWord(await g.bytes())).rejects.toThrow("original questions");
  });
  it("rejects tracked changes, macro files and oversized uploads", async () => {
    const f = await fixture(); f.doc.documentElement.appendChild(f.doc.createElementNS(NS, "w:del"));
    await expect(parseTeamWord(await f.bytes())).rejects.toThrow("tracked changes");
    const g = await fixture(); g.zip.file("word/vbaProject.bin", "unsafe");
    await expect(parseTeamWord(await g.bytes())).rejects.toThrow("Macros");
    await expect(parseTeamWord(new ArrayBuffer(2_000_001))).rejects.toThrow("2 MB");
  });
  it("makes Excel team details visible on opening and on its instruction sheet", async () => {
    const wb = new Workbook(); await wb.xlsx.load(buffer(await createTeamWorkbook(options)));
    expect(wb.views[0]?.activeTab).toBe(1);
    expect(wb.getWorksheet("Team")!.getCell("B6").value).toBe(options.team);
    expect(wb.getWorksheet("Team")!.getCell("B7").value).toBe(options.members);
    expect(wb.getWorksheet("Instructions")!.getCell("B2").value).toBe(options.team);
    expect(wb.getWorksheet("Instructions")!.getCell("B3").value).toBe(options.members);
  });
});
