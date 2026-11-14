// Helpers for the joint rehearsal: two browser windows (patient phone + hospital desk), small API calls, result list.
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function makeKit({ browser, API, PORTAL, APP, shots }) {
  const results = []; const logs = []; const notes = [];
  const check = (label, pass, extra = '') => { results.push({ label, pass: Boolean(pass) }); console.log((pass ? 'PASS ' : 'FAIL ') + label, extra === '' ? '' : (typeof extra === 'string' ? extra : JSON.stringify(extra))); };
  const watch = (page, who) => { page.on('console', (m) => { if (m.type() === 'error') logs.push(who + ': ' + m.text()); }); page.on('pageerror', (e) => logs.push(who + ' pageerror: ' + e)); };
  const api = async (method, path, token, body) => (await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })).json().catch(() => ({}));
  let token = (await api('POST', '/auth/login', null, { email: 'patient@demo.test', password: 'demo1234' })).token;
  await api('POST', '/demo/reset', token);

  const deskCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); const desk = await deskCtx.newPage(); watch(desk, 'portal');
  await desk.goto(PORTAL + '/login'); await desk.locator('input').nth(0).fill('staff@demo'); await desk.locator('input').nth(1).fill('demo123');
  await desk.click('button:has-text("Log in")'); await desk.waitForURL('**/dashboard', { timeout: 15000 });
  const phones = []; const phone = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, geolocation: { latitude: 23.0225, longitude: 72.5714 }, permissions: ['geolocation'] }); phones.push(ctx); const p = await ctx.newPage(); watch(p, 'patient'); return p; };
  const login = async (p) => { await p.goto(APP + '/login'); await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(APP + '/'); };
  const card = (id) => desk.locator('[data-testid=alert-card][data-id="' + id + '"]');

  // Start a heart alert in the patient app. send:true presses "Send now" (SOS), send:false waits in the countdown.
  async function patientStart(_from, { send = true } = {}) {
    const p = await phone(); await login(p);
    await p.click('text=Emergency help'); await p.click('text=Heart or chest'); await p.getByLabel('Chest pain or pressure').check(); await p.getByLabel('Shortness of breath').check();
    await p.click('text=Get help now'); await p.waitForURL('**/emergency/EM-*'); const id = p.url().split('/').pop();
    if (send) { await p.click('text=Send now'); await p.waitForSelector('text=Alert sent'); }
    return { page: p, id };
  }
  async function cancelInPatient(p, when) {
    if (when === 'countdown') { await p.click("text=I'm OK, cancel"); await p.waitForURL('**/cancelled'); return; }
    await p.getByRole('button', { name: 'False alarm? Cancel' }).click();
    await p.getByRole('button', { name: /yes|cancel|confirm/i }).last().click().catch(() => {});
    await p.waitForURL(/cancelled/, { timeout: 10000 }).catch(() => {});
  }
  async function apiAlert() { // an alert sent through the API (same calls the app makes)
    const e = await api('POST', '/emergencies', token, { patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN'] });
    await api('POST', '/emergencies/' + e.id + '/sos', token, { location: { lat: 23.0225, lng: 72.5714, accuracy: 20, source: 'gps' } }); return e.id;
  }
  async function checkIn() { // /demo -> Simulated fall -> no answer -> alert starts after 30 s (nominal)
    const p = await phone(); await login(p); await api('PUT', '/patients/PT-2026-0417/preferences', token, { safety_checkin: { enabled: true, minutes: 15 } });
    await p.goto(APP + '/demo'); await p.getByRole('button', { name: 'Simulated fall' }).click(); await p.waitForSelector('text=Are you OK?');
    await p.waitForURL(/\/emergency\//, { timeout: 60000 }).catch(() => {}); const id = p.url().split('/').pop();
    if (/^EM-/.test(id)) { await p.getByRole('button', { name: /send now/i }).click().catch(() => {}); await card(id).waitFor({ timeout: 20000 }).catch(() => {}); return id; } return null;
  }
  const shot = async (name, page) => { if (shots) await page.screenshot({ path: shots + '/' + name + '.png' }); };
  return { check, api, tok: () => token, desk, phone, card, patientStart, cancelInPatient, apiAlert, checkIn, shot, logs, results, note: (n) => notes.push(n), done: async () => { await Promise.all(phones.map((c) => c.close())); } };
}
