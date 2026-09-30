import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const site = 'https://rsimd-items.pages.dev';
const api = 'https://rsimd-items-api.ohcsghana-main.workers.dev';
async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
}
async function verify() {
  const health = await request(`${api}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const page = await request(`${site}/team-forms`);
  assert.equal(page.status, 200);
  const html = await page.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(m => m[1]);
  assert.ok(assets.some(a => a.endsWith('.js')), 'Missing website JS');
  assert.ok(assets.some(a => a.endsWith('.css')), 'Missing website CSS');
  for (const asset of assets) assert.equal((await request(site + asset)).status, 200, asset);
  if (process.env.GITHUB_SHA) {
    const release = await request(`${site}/release.json?commit=${process.env.GITHUB_SHA}`);
    assert.equal(release.status, 200);
    assert.equal((await release.json()).commit, process.env.GITHUB_SHA, 'Website release does not match tested commit');
  }
  for (const action of ['preview', 'import']) {
    const response = await request(`${api}/api/team-forms/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: site }, body: '{}' });
    assert.equal(response.status, 401, `Anonymous ${action} must be rejected`);
    assert.equal(response.headers.get('access-control-allow-origin'), site);
  }
  const preflight = await request(`${api}/api/team-forms/import`, { method: 'OPTIONS', headers: { Origin: site, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), site);
}
for (let attempt = 1; attempt <= 6; attempt++) {
  try { await verify(); console.log('Production health, website assets, release identity and anonymous access checks passed.'); break; }
  catch (error) {
    if (attempt === 6) throw error;
    console.log(`Verification attempt ${attempt} failed: ${error.message}; retrying in 10 seconds.`);
    await setTimeout(10000);
  }
}
