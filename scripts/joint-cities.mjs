// Two-city joint rehearsal: patient app (phone) + THIS repo's hospital portal (desk) + the mock in HOSPITAL_MODE=manual.
//   node scripts/joint-cities.mjs     (Chrome via CHROME_PATH; builds both apps against the mock; not part of CI)
// Pune: patient in Pune sends SOS -> the Pune desk acknowledges and dispatches -> the ambulance is a Pune one and stays near Pune.
// Ahmedabad: the same (no regression). Prints PASS/FAIL per check; exits 1 on any failure.
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'http://localhost:4300', PORTAL = 'http://localhost:5174', APP = 'http://localhost:5374';
const children = []; process.on('exit', () => children.forEach((c) => c.kill()));
const sh = (cmd, args, options) => { const r = spawnSync(cmd, args, { stdio: 'inherit', ...options }); if (r.status !== 0) throw new Error(cmd + ' ' + args.join(' ') + ' failed'); };
const run = (cmd, args, options) => children.push(spawn(cmd, args, { stdio: 'ignore', ...options }));
async function waitFor(url) { for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 500)); } throw new Error('no answer from ' + url); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const portalDir = path.join(root, 'hospital-portal'), appDir = path.join(root, 'patient-app');
const portalEnv = { ...process.env, VITE_USE_MOCK: 'false', VITE_API_BASE_URL: API, VITE_WS_URL: API.replace('http', 'ws') + '/ws' };
sh('npx', ['vite', 'build', '--outDir', 'dist-joint-cities', '--emptyOutDir'], { cwd: portalDir, env: portalEnv, stdio: 'ignore' });
sh('npx', ['vite', 'build', '--outDir', 'dist-joint', '--emptyOutDir'], { cwd: appDir, env: { ...process.env, VITE_API_URL: API, VITE_DEMO_TOOLS: 'true' }, stdio: 'ignore' });
run('node', ['server.js'], { cwd: path.join(root, 'mock-server'), env: { ...process.env, PORT: '4300', HOSPITAL_MODE: 'manual', DEMO_SPEED: '5', CORS_ORIGINS: [PORTAL, APP].join(',') } });
run('npx', ['vite', 'preview', '--outDir', 'dist-joint-cities', '--port', '5174', '--strictPort'], { cwd: portalDir, env: portalEnv });
run('npx', ['vite', 'preview', '--outDir', 'dist-joint', '--port', '5374', '--strictPort'], { cwd: appDir, env: process.env });
await waitFor(API + '/health'); await waitFor(PORTAL + '/'); await waitFor(APP + '/');

const api = async (method, p, token, body) => (await fetch(API + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })).json().catch(() => ({}));
const results = []; const logs = [];
const check = (label, pass, extra = '') => { results.push(Boolean(pass)); console.log((pass ? 'PASS ' : 'FAIL ') + label, extra === '' ? '' : JSON.stringify(extra)); };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const token = (await api('POST', '/auth/login', null, { email: 'patient@demo.test', password: 'demo1234' })).token;

const CASES = [
  { id: 'PNQ', name: 'Pune', geo: { latitude: 18.5204, longitude: 73.8567 }, desk: 'staff@pune', pw: 'demo123', prefix: 'AMB-PNQ', box: { lat: [18.2, 18.9], lng: [73.5, 74.2] } },
  { id: 'AMD', name: 'Ahmedabad', geo: { latitude: 23.0225, longitude: 72.5714 }, desk: 'staff@demo', pw: 'demo123', prefix: 'AMB-AMD', box: { lat: [22.8, 23.3], lng: [72.3, 72.9] } },
];
for (const c of CASES) {
  await api('POST', '/demo/reset', token);
  const pid = 'PT-2026-0417';
  await api('PATCH', '/patients/' + pid, token, { home_city_id: c.id });
  const deskCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); const desk = await deskCtx.newPage();
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 800 }, geolocation: c.geo, permissions: ['geolocation'] }); const phone = await phoneCtx.newPage();
  for (const [pg, who] of [[desk, 'portal'], [phone, 'patient']]) { pg.on('pageerror', (e) => logs.push(who + ' ' + e)); }
  await phone.goto(APP + '/login'); await phone.fill('input[type=email]', 'patient@demo.test'); await phone.fill('input[type=password]', 'demo1234'); await phone.click('button[type=submit]'); await phone.waitForURL(APP + '/');
  await phone.click('text=Emergency help'); await phone.click('text=Heart or chest'); await phone.getByLabel('Chest pain or pressure').check(); await phone.getByLabel('Shortness of breath').check();
  await phone.click('text=Get help now'); await phone.waitForURL('**/emergency/EM-*'); const id = phone.url().split('/').pop();
  await phone.click('text=Send now'); await phone.waitForSelector('text=Alert sent');
  await phone.waitForSelector('text=/Hospital: /', { timeout: 8000 });
  const em = await api('GET', '/emergencies/' + id, token);
  check(c.name + ': the SOS went to a ' + c.name + ' hospital', em.city_id === c.id && em.hospital && em.hospital.id.startsWith('HSP-' + c.id + '-'), { city: em.city_id, hospital: em.hospital && em.hospital.id });

  await desk.goto(PORTAL + '/login'); await desk.locator('input').nth(0).fill(c.desk); await desk.locator('input').nth(1).fill(c.pw);
  await desk.click('button:has-text("Log in")'); await desk.waitForURL('**/dashboard', { timeout: 15000 });
  await desk.getByTestId('city-showing').first().waitFor({ timeout: 10000 });
  let shownText = ''; for (let i = 0; i < 16; i++) { shownText = await desk.getByTestId('city-showing').first().innerText(); if (shownText.includes(c.name)) break; await sleep(500); } check(c.name + ': the desk shows ' + c.name + ' and offers no city switch', shownText.includes(c.name) && (await desk.getByTestId('city-switcher').count()) === 0, shownText);
  const card = desk.locator('[data-testid=alert-card][data-id="' + id + '"]');
  await card.waitFor({ timeout: 15000 });
  check(c.name + ': the alert is in the ' + c.name + ' desk queue', await card.count() === 1);
  await card.click();
  await desk.locator('button[data-action=HOSPITAL_ACKNOWLEDGED]').click();
  await desk.locator('button[data-action=AMBULANCE_DISPATCHED]').waitFor({ timeout: 15000 });
  await desk.locator('button[data-action=AMBULANCE_DISPATCHED]').click();
  await desk.getByTestId('confirm-dispatch').click();
  let amb = null;
  for (let i = 0; i < 40 && !amb; i++) { await sleep(500); const e = await api('GET', '/emergencies/' + id, token); if (e.ambulance && e.ambulance.id) amb = e.ambulance; }
  check(c.name + ': an ambulance was dispatched', Boolean(amb), amb);
  check(c.name + ': the ambulance belongs to ' + c.name, amb && amb.id.startsWith(c.prefix), amb && amb.id);
  // Follow the ambulance for a few seconds: every position stays inside the city box.
  const seen = [];
  for (let i = 0; i < 12; i++) { const a = ((await api('GET', '/ambulances', token)) || []).find?.((x) => x.id === amb.id); if (a && typeof a.lat === 'number') seen.push([a.lat, a.lng]); await sleep(500); }
  const inside = seen.length > 0 && seen.every(([la, ln]) => la >= c.box.lat[0] && la <= c.box.lat[1] && ln >= c.box.lng[0] && ln <= c.box.lng[1]);
  check(c.name + ': the ambulance route stays inside ' + c.name, inside, { samples: seen.length, first: seen[0], last: seen[seen.length - 1] });
  await deskCtx.close(); await phoneCtx.close();
}
check('no page errors in either window', logs.length === 0, logs.slice(0, 5));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log('\nTwo-city joint rehearsal: ' + (results.length - failed) + '/' + results.length + ' checks passed');
process.exit(failed ? 1 : 0);
