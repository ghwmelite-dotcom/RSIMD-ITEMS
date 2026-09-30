// Synthetic local end-to-end test. All external browser requests are blocked.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import ExcelJS from 'exceljs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.wrangler/staff-onboarding'); await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await build({ entryPoints: [path.join(root, 'api/src/index.ts')], outfile: path.join(out, 'api.cjs'), bundle: true, platform: 'node', format: 'cjs' });
const worker = require(path.join(out, 'api.cjs')).default;
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(path.join(root, 'api/src/db/schema.sql'), 'utf8'));
sqlite.exec("INSERT INTO technicians(id,name,role,password_hash) VALUES ('admin','Synthetic admin','admin','unused'); INSERT INTO org_entities(id,name,code,type) VALUES ('dir','Synthetic directorate','RSIMD','directorate');");
const sessions = new Map([['session:ritems_admin', JSON.stringify({ technician_id: 'admin', name: 'Synthetic admin', role: 'admin', session_version: 0 })]]);
function stmt(sql, args = []) { return { bind: (...values) => stmt(sql, values), first: async () => sqlite.prepare(sql).get(...args) ?? null, all: async () => ({ results: sqlite.prepare(sql).all(...args) }), run: async () => sqlite.prepare(sql).run(...args) }; }
const env = { DB: { prepare: stmt, batch: async statements => { sqlite.exec('BEGIN'); try { const result = []; for (const s of statements) result.push(await s.run()); sqlite.exec('COMMIT'); return result; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } }, KV: { get: async key => sessions.get(key) ?? null, put: async (key, value) => sessions.set(key, value), delete: async key => sessions.delete(key) } };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const response = await worker.fetch(new Request(url, { method: req.method, headers: req.headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) }), env);
      if (response.status >= 400) console.error("Local API failure", url.pathname, response.status, await response.clone().text());
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const file = url.pathname.startsWith('/assets/') ? path.join(root, 'web/dist/assets', path.basename(url.pathname)) : path.join(root, 'web/dist/index.html');
    res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(await readFile(file));
  } catch (e) { console.error("Local server error", String(e)); res.writeHead(500); res.end(String(e)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/api/')) { const response = await route.fetch({ url: `${base}${url.pathname}${url.search}` }); return route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': base } }); }
  if (url.origin === base) return route.continue(); return route.abort();
});
try {
  await page.goto(`${base}/login`); await page.evaluate(() => localStorage.setItem('rsimd_items_token', 'ritems_admin')); await page.goto(`${base}/admin`);
  await page.getByRole('button', { name: 'Staff accounts', exact: true }).click();
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download staff template' }).click();
  const file = path.join(out, 'staff-template.xlsx'); await (await downloading).saveAs(file);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
  wb.getWorksheet('Staff').getRow(2).values = ['001007', 'Synthetic officer', 'Officer', 'Member', '', ''];
  const filled = path.join(out, 'filled-staff.xlsx'); await wb.xlsx.writeFile(filled);
  await page.getByLabel('Completed staff template').setInputFiles(filled);
  await page.getByRole('button', { name: 'Create 1 staff accounts', exact: true }).waitFor();
  assert.equal(sqlite.prepare('SELECT count(*) n FROM technicians').get().n, 1);
  await page.screenshot({ path: path.join(out, 'staff-import-preview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Create 1 staff accounts', exact: true }).click();
  await page.getByText('1 accounts created; 0 existing accounts left unchanged.').waitFor();
  assert.equal(sqlite.prepare('SELECT count(*) n FROM technicians').get().n, 2);
  const pinsDownloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download private temporary PINs' }).click();
  const pinsFile = path.join(out, 'synthetic-pins.xlsx'); await (await pinsDownloading).saveAs(pinsFile);
  const pins = new ExcelJS.Workbook(); await pins.xlsx.readFile(pinsFile); assert.equal(pins.worksheets[0].getCell('C2').value, '1007');
  await page.getByRole('button', { name: 'Clear PIN list' }).click();
  await page.getByLabel('Completed staff template').setInputFiles(filled);
  await page.getByRole('button', { name: 'Create 0 staff accounts', exact: true }).waitFor();
  await page.evaluate(() => localStorage.clear()); await page.goto(`${base}/login`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Staff ID', { exact: true }).fill('001007'); await page.getByLabel('PIN', { exact: true }).fill('1007');
  await page.screenshot({ path: path.join(out, 'staff-id-login.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: 'Your PIN preference' }).waitFor();
  await page.getByLabel('Current PIN', { exact: true }).fill('1007');
  await page.screenshot({ path: path.join(out, 'keep-pin-choice.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.getByRole('button', { name: 'Keep my current PIN' }).click();
  await page.getByRole('heading', { name: 'Your PIN preference' }).waitFor({ state: 'hidden' });
  assert.equal(sqlite.prepare("SELECT must_change_pin FROM technicians WHERE staff_id='001007'").get().must_change_pin, 0);
  await page.goto(`${base}/admin`); await page.getByText('Administrator access is required.').waitFor();
  await page.evaluate(() => localStorage.clear()); await page.goto(`${base}/login`);
  await page.getByLabel('Staff ID', { exact: true }).fill('001007'); await page.getByLabel('PIN', { exact: true }).fill('1007');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForURL(`${base}/`);
  assert.equal(await page.getByRole('heading', { name: 'Your PIN preference' }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: browser template, preview-only, account creation, last-four PIN, repeat import, Staff ID login, keep-PIN opt-out, remembered choice and admin denial. Synthetic local records only.');
} catch (error) {
  console.error(await page.locator('body').innerText()); await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); throw error;
} finally { await browser.close(); server.close(); sqlite.close(); }
