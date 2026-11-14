// Phase 9 scenarios i-l of the joint rehearsal: staff passport, escalation, availability, refused WebSocket login. Uses the kit from joint-util.mjs.
import { sleep } from './joint-util.mjs';

export async function runPhase9(k, { API, shots }) {
  const { check, api, tok, desk, card } = k;
  const scopeAll = desk.locator('[data-testid=scope-all]');
  const showAll = async () => { if (await scopeAll.count()) await scopeAll.click().catch(() => {}); };

  // i) staff opens the passport from the readiness card: history consent on shows allergies, off shows "Not shared"
  for (const [history, label] of [[true, 'on'], [false, 'off']]) {
    await api('PUT', '/patients/PT-2026-0417/consents', tok(), { history });
    const id = await k.apiAlert(); await showAll(); await card(id).waitFor({ timeout: 15000 }).catch(() => {}); await card(id).click().catch(() => {});
    await desk.locator('[data-testid=open-passport]').click().catch(() => {});
    const panel = desk.locator('[data-testid=passport-panel]'); await panel.waitFor({ timeout: 8000 }).catch(() => {});
    const allergies = await desk.locator('[data-testid=passport-allergies]').innerText().catch(() => '(no panel)');
    const err = await desk.locator('[data-testid=passport-error]').innerText().catch(() => '');
    check(`i${label === 'on' ? 1 : 2} staff Open passport, history consent ${label}: allergies row reads ${label === 'on' ? '"Penicillin"' : '"Not shared"'}`,
      label === 'on' ? /Penicillin/.test(allergies) : /Not shared/.test(allergies), err || allergies);
    if (label === 'on') await k.shot('portal-passport-open', desk);
    await api('POST', '/emergencies/' + id + '/cancel', tok());
  }
  await api('PUT', '/patients/PT-2026-0417/consents', tok(), { history: true });
  const audit = await api('GET', '/audit?page=1&page_size=200', (await api('POST', '/auth/login', null, { email: 'admin@demo.test', password: 'demo1234' })).token);
  check('i3 admin audit log lists the two staff passport views (no tokens)', (audit.rows || []).filter((r) => r.action === 'passport.staff_view').length >= 2 && !/token/i.test(JSON.stringify(audit)));

  // j) nobody acknowledges -> the alert moves to the next hospital (hospital.escalated, then hospital.alerted)
  await api('POST', '/demo/no-ack', tok(), { enabled: true, escalate_after_seconds: 5 });
  const j = await k.apiAlert(); await showAll(); await card(j).waitFor({ timeout: 15000 }).catch(() => {});
  const was = await card(j).getAttribute('data-state').catch(() => '');
  await desk.waitForSelector('[data-testid=alert-card][data-id=' + j + '][data-state=ESCALATED]', { timeout: 20000 }).catch(() => {});
  const now = await card(j).getAttribute('data-state').catch(() => '');
  const jt = (await card(j).innerText().catch(() => '')).replace(/\n/g, ' | ');
  check('j1 no acknowledgement: portal card data-state goes SOS_SENT -> ESCALATED (was ' + was + ', now ' + now + ')', now === 'ESCALATED', jt);
  await k.shot('portal-escalated-card', desk);
  await api('POST', '/emergencies/' + j + '/cancel', tok()); await api('POST', '/demo/no-ack', tok(), { enabled: false });

  // k) availability saved on the server
  await desk.goto(desk.url().replace(/\/[^/]*$/, '/dashboard')).catch(() => {});
  await desk.locator('[data-testid=toggle-availability]').click().catch(() => {});
  const form = desk.locator('[data-testid=availability-form]'); await form.waitFor({ timeout: 8000 }).catch(() => {});
  await form.locator('input[name=beds_free]').fill('9').catch(() => {}); await form.locator('button:has-text("Save availability")').click().catch(() => {});
  const status = await desk.locator('[data-testid=availability-status]').innerText({ timeout: 8000 }).catch(() => '(no status)');
  const login = await api('POST', '/auth/login', null, { email: 'staff@demo', password: 'demo123' });
  const list = await api('GET', '/hospitals', login.token); const own = (Array.isArray(list) ? list : []).find((h) => h.id === login.hospital_id);
  check('k1 portal Save availability says saved (not "screen only"): ' + JSON.stringify(status), /^Saved/.test(status) && !/screen only/i.test(status));
  check('k2 the server really holds the change (GET /hospitals beds_free = 9)', own && own.availability.beds_free === 9, own && own.availability);

  // l) a socket with a wrong login token is refused
  const code = await desk.evaluate((url) => new Promise((resolve) => { const w = new WebSocket(url + '/ws?token=not-a-real-token'); w.onclose = (e) => resolve(e.code); setTimeout(() => resolve('still open'), 6000); }), API.replace(/^http/, 'ws'));
  check('l1 WebSocket with a wrong token is closed with code 1008', code === 1008, code);
}
