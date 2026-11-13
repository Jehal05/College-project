// Phase 6: Why this alert, vitals trend, demo panel, speed, summary.
import { BASE, API, api, check, finish, freshState, launch, login, newPage, phone, sleep } from './helpers.mjs';

const NORMAL = process.env.TEST_NORMAL_URL || 'http://localhost:5275';
const FORBIDDEN = /diagnos|\brisk|abnormal|danger|\bnormal\b|score|probab/i;
const tok = await freshState();
const browser = await launch(); const ctx = await phone(browser, { viewport: { width: 390, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const p = await newPage(ctx); await login(p);

// ---- Trend
await p.waitForSelector("text=Simulated wearable data", { timeout: 8000 });
await p.waitForFunction(() => document.querySelectorAll('svg[role=img][aria-label]').length >= 4, null, { timeout: 20000 });
check('T1 Home shows 4 sparklines with text alternatives', (await p.locator('svg[role=img][aria-label]').count()) >= 4);
const labelsBefore = await p.innerText('body');
check('T2 neutral label shown, no forbidden words', /Within your usual range|Changed from your usual/.test(labelsBefore) && !FORBIDDEN.test(labelsBefore.replace('Not a medical diagnosis', '').replace('Not a diagnosis', '')));
const bad = await api('POST', '/demo/vitals', tok, { profile: 'nope' }); check('T3 unknown profile -> error', bad.error || bad.code);
await api('POST', '/demo/vitals', tok, { profile: 'heart_attack' });
await p.waitForFunction(() => document.body.innerText.includes('Changed from your usual'), null, { timeout: 15000 });
check('T4 label changes after profile change', true);
const store = await p.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
const keys = await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
check('T5 no trend/reminder/summary/emergency data in browser storage', keys.every((k) => !/vital|trend|remind|summary|emergenc|checkin|history/i.test(k)), keys);
await api('POST', '/demo/reset', tok);

// ---- Consent off -> no trend
await api('PUT', '/patients/HT-1001/consents', tok, { location: true, history: true, vitals: false, reports: true });
await p.reload(); await p.waitForSelector('text=Live vitals sharing is off', { timeout: 8000 });
check('T6 vitals consent off: sharing-off text with consent link', (await p.getByRole('link', { name: 'Change in Consent settings' }).count()) >= 1);
await api('PUT', '/patients/HT-1001/consents', tok, { location: true, history: true, vitals: true, reports: true });

// ---- Why this alert + summary
const e = await api('POST', '/emergencies', tok, { patient_id: 'HT-1001', type: 'HEART', symptoms: ['CHEST_PAIN'], location: { lat: 21.17, lng: 72.83 }, consents: { location: true, history: true, vitals: true, reports: true } });
const id = e.emergency_id || e.id; check('W0 emergency created', Boolean(id), e);
await api('POST', '/emergencies/' + id + '/sos', tok, { location: { lat: 21.17, lng: 72.83 } });
const rs = await api('GET', '/emergencies/' + id + '/reasons', tok);
check('W1 reasons endpoint shape', rs.simulated === true && rs.reviewed === false && Array.isArray(rs.matched_rules) && rs.matched_rules.length > 0 && rs.matched_rules.every((r) => r.reviewed === false), rs);
await p.goto(BASE + '/emergency/' + id); await p.waitForSelector('text=Why this alert');
check('W2 card collapsed by default', (await p.locator('text=What you told us').count()) === 0 || !(await p.locator('text=What you told us').first().isVisible()));
await p.getByText('Why this alert').first().click(); await p.waitForSelector('text=What you told us');
const why = await p.innerText('main');
check('W3 opened: three parts + neutral line + draft note', ['What you told us', 'What your readings showed', 'Which checklist matched', 'This combination is on our alert checklist.', 'draft waiting for a doctor'].every((s) => why.includes(s)));
check('W4 pending rule never shows its medical sentence', !rs.matched_rules.some((r) => why.includes(r.reason)));
check('W5 no score / diagnosis words in panel', !FORBIDDEN.test(why.replace(/Not a medical diagnosis\.?/g, '').replace(/not .*diagnosis/gi, '')));
check('W6 call link is plain tel:112', (await p.locator('a[href="tel:112"]').count()) >= 1);

// Reasons failure leaves flow alone
await p.route('**/emergencies/*/reasons', (r) => r.fulfill({ status: 500, body: '{}' }));
await p.reload(); await p.waitForSelector('text=Why this alert'); await p.getByText('Why this alert').first().click();
await p.waitForSelector('text=Reasons are not available right now'); check('W7 reasons error -> friendly text, flow still shown', (await p.locator('a[href="tel:112"]').count()) >= 1);
await p.unroute('**/emergencies/*/reasons');

// Summary after the run ends (DEMO_SPEED 10)
await sleep(100);
let sum; for (let i = 0; i < 40; i++) { sum = await api('GET', '/patients/HT-1001/emergencies/' + id + '/summary', tok); if (sum.final_state === 'HANDOVER_DONE') break; await sleep(1000); }
check('S1 summary endpoint shape', sum && sum.simulated === true && Array.isArray(sum.timeline) && sum.durations && 'to_acknowledged' in sum.durations && sum.source === 'MANUAL', sum);
const list = await api('GET', '/patients/HT-1001/emergencies', tok); check('S2 emergency list includes it', Array.isArray(list) && list.some((x) => x.id === id));
await p.goto(BASE + '/summary/' + id); await p.waitForSelector('text=Alert record'); await p.waitForSelector('text=/Hospital acknowledged after/');
const st = await p.innerText('main');
check('S3 summary shows record line, durations, footer', st.includes('This is a record of what the app did. It does not describe your health.') && /Hospital acknowledged after/.test(st) && st.includes('Prepared by the app. Not verified by a doctor.'), st.slice(0, 200));
check('S4 summary has no forbidden/outcome words', !/outcome|diagnos(?!is\.)|risk|abnormal|danger/i.test(st.replace('Not a medical diagnosis', '')));
await p.getByPlaceholder(/Type your own notes/).fill('My own note'); await p.getByRole('button', { name: 'Copy text' }).click(); await p.waitForSelector('text=Copied.');
const clip = await p.evaluate(() => navigator.clipboard.readText());
check('S5 copied text includes the note and the footer', clip.includes('My own note') && clip.includes('Not verified by a doctor'));
const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download as text file' }).click()]);
check('S6 download is a .txt file', /\.txt$/.test(dl.suggestedFilename()), dl.suggestedFilename());
check('S7 print button present', (await p.getByRole('button', { name: 'Print / Save as PDF' }).count()) === 1);
await p.goto(BASE + '/profile'); await p.waitForSelector('text=Past alerts');
check('S8 Past alerts list links to the summary', (await p.locator('a[href^="/summary/"]').count()) >= 1);

// ---- Demo panel + speed
await p.goto(BASE + '/demo'); await p.waitForSelector("[data-testid='demo-status']"); await p.waitForFunction(() => /Speed \d+/.test(document.querySelector("[data-testid='demo-status']").innerText), null, { timeout: 8000 });
check('D1 demo status shows speed and profile', /Speed \d+× · Vitals:/.test(await p.innerText("[data-testid='demo-status']")));
await p.getByRole('button', { name: '20×' }).click(); await sleep(500);
const ds = await api('GET', '/demo/state', tok); check('D2 speed change echoed in /demo/state', ds.speed === 20 || ds.multiplier === 20, ds);
const badSpeed = await fetch(API + '/demo/speed', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ multiplier: 3 }) });
check('D3 invalid speed -> 400', badSpeed.status === 400);
await api('POST', '/demo/speed', tok, { multiplier: 10 });
check('D4 rehearsal checklist ticks (in memory)', await (async () => { const cb = p.getByRole('checkbox').first(); await cb.check(); return cb.isChecked(); })());
await p.getByRole('button', { name: /Run STROKE|Run Stroke|Run .*Stroke/i }).first().click().catch(() => {});
const norm = await phone(browser); const n = await newPage(norm); await login(n, NORMAL);
await n.goto(NORMAL + '/demo'); await sleep(500);
check('D5 normal build: /demo is not found and no demo text', !(await n.innerText('body')).includes('Demo tools') && !(await n.innerText('body')).includes('Rehearsal script'));
finish('phase6-alert');
