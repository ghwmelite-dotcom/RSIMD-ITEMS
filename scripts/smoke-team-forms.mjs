// Local synthetic browser rehearsal. No production calls or credentials.
// Set PLAYWRIGHT_MODULE to an installed playwright module path if not on NODE_PATH.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".wrangler/team-forms"); await mkdir(out, { recursive: true });
await build({ entryPoints: [path.join(root, "api/src/routes/team-forms.ts")], outfile: path.join(out, "api.cjs"), bundle: true, platform: "node", format: "cjs" });
const { teamFormImport } = require(path.join(out, "api.cjs"));
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(await readFile(path.join(root, "api/src/db/schema.sql"), "utf8"));
sqlite.exec("INSERT INTO technicians (id,name,role,password_hash) VALUES ('test','Synthetic officer','lead','not-a-credential'); INSERT INTO org_entities (id,name,code,type) VALUES ('test-dir','Synthetic directorate','RSIMD','directorate');");
function statement(sql, args = []) { return {
  bind: (...values) => statement(sql, values), first: async () => sqlite.prepare(sql).get(...args) ?? null,
  all: async () => ({ results: sqlite.prepare(sql).all(...args) }), run: async () => sqlite.prepare(sql).run(...args),
}; }
const env = { DB: { prepare: statement, batch: async statements => {
  sqlite.exec("BEGIN"); try { const results = []; for (const s of statements) results.push(await s.run()); sqlite.exec("COMMIT"); return results; }
  catch (e) { sqlite.exec("ROLLBACK"); throw e; }
} }, KV: { get: async () => JSON.stringify({ technician_id: "test", role: "lead", name: "Synthetic officer" }) } };
const server = createServer(async (req, res) => {
  try {
    const route = new URL(req.url, "http://localhost").pathname;
    if (route.startsWith("/api/")) {
      if (route.startsWith("/api/team-forms/")) {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const response = await teamFormImport(new Request(`http://localhost${route}`, { method: "POST", headers: req.headers, body: Buffer.concat(chunks) }), env, route.endsWith("/import"));
        res.writeHead(response.status, { "Content-Type": "application/json" }); res.end(await response.text()); return;
      }
      const result = route === "/api/auth/me" ? { id: "test", name: "Synthetic officer", role: "lead", assigned_entities: [] }
        : route === "/api/org-entities" ? [{ id: "test-dir", name: "Synthetic directorate", code: "RSIMD", is_active: true, rooms: [] }] : [];
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(result)); return;
    }
    const file = route.startsWith("/assets/") ? path.join(root, "web/dist", path.basename(route) === route.slice(8) ? route : "index.html") : path.join(root, "web/dist/index.html");
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html" }); res.end(content);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, serviceWorkers: "block" });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      const response = await route.fetch({ url: `${base}${url.pathname}${url.search}` });
      return route.fulfill({ response });
    }
    if (url.origin === base) return route.continue();
    return route.abort();
  });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("rsimd_items_token", "ritems_synthetic"));
  await page.goto(`${base}/team-forms`);
  await page.getByLabel("Team name", { exact: true }).fill("Synthetic room team");
  await page.getByLabel("Participating officers", { exact: true }).fill("Test IT officer, Test admin officer");
  await page.getByLabel("Reporting quarter", { exact: true }).selectOption("3");
  const downloading = page.waitForEvent("download"); await page.getByRole("button", { name: "Download Excel form" }).click();
  const download = await downloading; const filename = path.join(out, "browser-download.xlsx"); await download.saveAs(filename);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(filename);
  assert.equal(wb.getWorksheet("Team").getCell("B6").value, "Synthetic room team");
  assert.equal(wb.getWorksheet("Team").getCell("B7").value, "Test IT officer, Test admin officer");
  assert.equal(wb.views[0].activeTab, 1);
  assert.equal(wb.getWorksheet("Instructions").getCell("B2").value, "Synthetic room team");
  wb.getWorksheet("Rooms").getRow(2).values = ["RSIMD", "19", "2026-10-01", "on_site", "visited", "Two synthetic devices checked"];
  wb.getWorksheet("Devices").getRow(2).values = ["RSIMD", "19", "2026-10-01", "TEST-PC-1", "desktop", "Synthetic PC", "functional", "Boot and network", "No repair needed", "functional", "Opened shared drive", "", "", "Test IT officer"];
  wb.getWorksheet("Devices").getRow(3).values = ["RSIMD", "19", "2026-10-01", "TEST-PRINTER-1", "printer", "Synthetic printer", "nonfunctional", "Power and test page", "Cleaned feed", "nonfunctional", "Test page failed", "No toner", "Replace toner", "Test IT officer"];
  const filled = path.join(out, "filled.xlsx"); await wb.xlsx.writeFile(filled);
  await page.getByLabel("Completed Word or Excel form", { exact: true }).setInputFiles(filled);
  await page.getByRole("button", { name: "Save records for Q3 2026" }).waitFor();
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get().n, 0);
  await page.screenshot({ path: path.join(out, "desktop-preview.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "No horizontal page overflow");
  await page.screenshot({ path: path.join(out, "mobile-preview.png"), fullPage: true });
  await page.getByRole("heading", { name: "3. Check and save", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, "mobile-results.png"), fullPage: true });
  await page.getByRole("button", { name: "Save records for Q3 2026" }).click();
  await page.getByRole("heading", { name: "Records saved", exact: true }).waitFor();
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get().n, 1);
  await page.getByLabel("Completed Word or Excel form", { exact: true }).setInputFiles(filled);
  await page.getByRole("heading", { name: "This form is already saved", exact: true }).waitFor();
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get().n, 1);
  const wordDownloading = page.waitForEvent("download"); await page.getByRole("button", { name: "Download Word form" }).click();
  const wordDownload = await wordDownloading; const wordFilename = path.join(out, "browser-download.docx"); await wordDownload.saveAs(wordFilename);
  const zip = await JSZip.loadAsync(await readFile(wordFilename));
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const doc = new DOMParser().parseFromString(await zip.file("word/document.xml").async("string"), "application/xml");
  assert.ok(doc.documentElement.textContent.includes("Synthetic room team"));
  assert.ok(doc.documentElement.textContent.includes("Test IT officer, Test admin officer"));
  function fillWord(title, entries) {
    const tbl = Array.from(doc.getElementsByTagNameNS(ns, "tbl")).find(t => t.getElementsByTagNameNS(ns, "tr")[0].textContent === title);
    for (const [label, value] of Object.entries(entries)) {
      const row = Array.from(tbl.getElementsByTagNameNS(ns, "tr")).find(r => r.getElementsByTagNameNS(ns, "tc")[0].textContent === label);
      const cell = row.getElementsByTagNameNS(ns, "tc")[1]; const para = cell.getElementsByTagNameNS(ns, "p")[0];
      while(para.firstChild) para.removeChild(para.firstChild);
      const run=doc.createElementNS(ns,"w:r"), text=doc.createElementNS(ns,"w:t");
      text.appendChild(doc.createTextNode(value));run.appendChild(text);para.appendChild(run);
    }
  }
  const location={"Office / directorate code":"RSIMD", "Room number":"20", "Date of visit (YYYY-MM-DD)":"2026-10-01"};
  fillWord("ROOM VISIT", {...location, "How did you assist?":"In person", "Was the room visited?":"Yes"});
  fillWord("DEVICE CHECK", {...location, "Asset tag or serial number":"TEST-WORD-PC", "Type of equipment":"Desktop computer", "Was it working before the visit?":"Working with a problem", "What did you check?":"The office folder would not open", "What did you do or fix?":"Replaced network cable", "Is it working after your work?":"Working", "How did you confirm the result?":"Office folder opened", "Name of officer who checked it":"Test IT officer"});
  zip.file("word/document.xml",new XMLSerializer().serializeToString(doc));
  const wordFilled=path.join(out,"filled.docx");await writeFile(wordFilled,await zip.generateAsync({type:"nodebuffer"}));
  await page.getByLabel("Completed Word or Excel form", { exact: true }).setInputFiles(wordFilled);
  await page.getByRole("button", { name: "Save records for Q3 2026" }).waitFor();
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get().n,1);
  await page.setViewportSize({width:1280,height:1000});
  await page.screenshot({path:path.join(out,"word-desktop-preview.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),false);
  await page.screenshot({path:path.join(out,"word-mobile-preview.png"),fullPage:true});
  await page.getByRole("button", { name: "Save records for Q3 2026" }).click();
  await page.getByRole("heading", { name: "Records saved", exact: true }).waitFor();
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get().n,2);
  await page.getByLabel("Completed Word or Excel form", { exact: true }).setInputFiles(wordFilled);
  await page.getByRole("heading", { name: "This form is already saved", exact: true }).waitFor();
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM team_forms").get().n,2);
  assert.deepEqual(errors, []);
  console.log("PASS: browser team prefill, Excel and Word completion, API previews, mobile overflow, saves, duplicate uploads; synthetic SQLite only.");
} catch (e) {
  if (page) { console.error("Browser state:", await page.locator("body").innerText()); await page.screenshot({ path: path.join(out, "failure.png"), fullPage: true }); }
  throw e;
} finally { await browser.close(); server.close(); sqlite.close(); }
