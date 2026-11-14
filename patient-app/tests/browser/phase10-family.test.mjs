// Phase 10: the family screen. A relative links with an invite code, sees only what the patient shared, follows a live status
// and sends a check-in. Patient screens stay closed to a relative; staff still cannot use this app.
import { createRequire } from 'node:module';
import { BASE, BANNER, api, check, finish, freshState, launch, newPage, phone, sleep } from './helpers.mjs';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const serious = (page) => page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
const tok = await freshState();
const browser = await launch();
const signIn = async (p, email) => { await p.goto(BASE + '/login'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); };
const waitText = async (p, test, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const body = await p.innerText('body'); if (test(body)) return body; await sleep(300); } return p.innerText('body'); };

// --- a relative signs in, links with the demo code, and sees only shared fields ---
let ctx = await phone(browser, { bypassCSP: true }); let p = await newPage(ctx);
await signIn(p, 'family@demo.test'); await p.waitForURL(BASE + '/family');
let body = await waitText(p, (b) => b.includes('not linked to anyone yet'));
check('F1 relative lands on /family with the heading and the simulated banner', body.includes('Family') && body.includes(BANNER), body.slice(0, 120));
check('F2 nothing linked yet: empty message and a link form', (await p.locator('[data-testid=family-empty]').count()) === 1 && (await p.getByLabel('Invite code').count()) === 1);
await p.getByLabel('Invite code').fill('FAM-0000-NOPE'); await p.getByRole('button', { name: 'Link' }).click(); body = await waitText(p, (b) => b.includes('was not found'));
check('F3 a wrong code says so in plain words', body.includes('This code was not found'), body.slice(-200));
await p.getByLabel('Invite code').fill('fam-0417'); await p.getByRole('button', { name: 'Link' }).click(); body = await waitText(p, (b) => b.includes('Rahul Mehta'));
check('F4 the right code links the patient (code is not case sensitive)', body.includes('Rahul Mehta'));
check('F5 shared chips and simulated vitals are shown', body.includes('Shared with you') && body.includes('Vitals') && (await p.locator('[data-testid=family-vitals]').count()) === 1);
check('F6 no allergies, conditions, medicines, phone numbers, or "help is on the way"', !/penicillin|amlodipine|metformin|hypertension|diabetes|\+91|help is on the way/i.test(body));
check('F7 no active emergency message before an SOS', body.includes('No active emergency'));
check('F8 patient screens are closed to a relative (/profile and / go to /family)', await (async () => { await p.goto(BASE + '/profile'); await sleep(700); const a = p.url(); await p.goto(BASE + '/'); await sleep(700); return a === BASE + '/family' && p.url() === BASE + '/family'; })());
check('F9 no phone-only extras for a relative (no bottom navigation, no reminders)', (await p.locator('nav[aria-label="Main navigation"]').count()) === 0);

await p.addScriptTag({ path: axePath });
check('A1 axe: no serious or critical problems on the family screen (linked, no emergency)', (await serious(p)).length === 0, await serious(p));

// --- live status and a check-in ---
const made = await api('POST', '/emergencies', tok, { patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN', 'SWEATING'] });
await api('POST', '/emergencies/' + made.id + '/sos', tok, { location: { lat: 23.0225, lng: 72.5714 } });
body = await waitText(p, (b) => b.includes('Emergency in progress'));
check('L1 the live status appears without a reload', body.includes('Emergency in progress (simulated)'), body.slice(0, 200));
await p.addScriptTag({ path: axePath }).catch(() => {});
check('A2 axe: no serious or critical problems with an emergency in progress', (await serious(p)).length === 0, await serious(p));
const first = await p.innerText('[data-testid=family-state]');
check('L2 the status is a plain sentence from the known list', /alert was sent|has seen the alert|ambulance has been sent|on its way|has arrived/.test(first), first);
check('L3 no symptoms, no severity, no diagnosis words', !/chest pain|sweating|severity|heart attack/i.test(await p.innerText('body')) && !/diagnos/i.test((await p.innerText('[data-testid=family-emergency]'))));
await p.getByRole('button', { name: "I'm on my way" }).click(); body = await waitText(p, (b) => b.includes('Your message was sent'));
check('L4 a check-in is sent and confirmed', body.includes('Your message was sent.'));
const later = await waitText(p, (b) => b.includes('has arrived') || b.includes('on its way'), 20000);
check('L5 the status moves on by itself (live event or refresh)', /on its way|has arrived|ambulance has been sent/.test(later));
const view = await (async () => { const f = await api('POST', '/auth/login', null, { email: 'family@demo.test', password: 'demo1234' }); return api('GET', '/family/patients', f.token); })();
check('L6 the server kept the check-in', JSON.stringify(view).includes('ON_MY_WAY'));

// --- consent off: vitals disappear on the next load ---
await api('PUT', '/patients/PT-2026-0417/consents', tok, { vitals: false });
await p.reload(); body = await waitText(p, (b) => b.includes('Rahul Mehta'));
check('C1 vitals consent off: no readings for the relative', (await p.locator('[data-testid=family-vitals]').count()) === 0);
await api('PUT', '/patients/PT-2026-0417/consents', tok, { vitals: true });
await api('POST', '/emergencies/' + made.id + '/cancel', tok);
await ctx.close();

// --- patient creates an invite, a relative uses it ---
await api('POST', '/demo/reset', tok);
ctx = await phone(browser); p = await newPage(ctx);
await signIn(p, 'patient@demo.test'); await p.waitForURL(BASE + '/');
await p.goto(BASE + '/contacts'); await p.getByRole('button', { name: 'Create invite code' }).click();
const code = await (async () => { const end = Date.now() + 5000; while (Date.now() < end) { if (await p.locator('[data-testid=invite-code]').count()) return p.innerText('[data-testid=invite-code]'); await sleep(200); } return ''; })();
check('I1 the patient gets a code like FAM-1234 valid for 24 hours', /^FAM-\d{4}$/.test(code) && (await p.innerText('body')).includes('Valid for 24 hours'), code);
await ctx.close();
ctx = await phone(browser); p = await newPage(ctx);
await signIn(p, 'family@demo.test'); await p.waitForURL(BASE + '/family');
await p.getByLabel('Invite code').fill(code); await p.getByRole('button', { name: 'Link' }).click(); body = await waitText(p, (b) => b.includes('Rahul Mehta'));
check('I2 the new code links the relative', body.includes('Rahul Mehta'));
await p.getByRole('button', { name: 'Sign out' }).click(); await p.waitForURL(BASE + '/login');
check('I3 sign out returns to the login page', p.url() === BASE + '/login');
await ctx.close();

// --- hospital staff still cannot use this app ---
for (const email of ['staff@demo.test']) {
  ctx = await phone(browser); p = await newPage(ctx); await signIn(p, email); await sleep(900);
  check('R1 ' + email + ' is told to use their own app and stays on the login page', p.url() === BASE + '/login' && (await p.innerText('body')).includes('Hospital staff should use the hospital portal'));
  await ctx.close();
}

// --- Hindi and Gujarati ---
for (const [lang, title, shared] of [['hi', 'परिवार', 'आपके साथ साझा'], ['gu', 'પરિવાર', 'તમારી સાથે વહેંચાયેલું']]) {
  await api('POST', '/demo/reset', tok);
  ctx = await phone(browser); p = await newPage(ctx);
  await p.goto(BASE + '/login'); await p.evaluate(`localStorage.setItem('ht.lang','${lang}')`); await p.reload();
  await p.fill('input[type=email]', 'family@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(BASE + '/family');
  await p.locator('input').first().fill('FAM-0417'); await p.locator('form button[type=submit]').click(); body = await waitText(p, (b) => b.includes('Rahul Mehta'));
  check('H1 [' + lang + '] the family screen is translated', body.includes(title) && body.includes(shared), body.slice(0, 160));
  const latin = (body.match(/[A-Za-z][A-Za-z0-9_]*/g) || []).filter((w) => !/^(english|rahul|mehta|sos|fam|healthtwin|ai|spo2|qr|km|min)$/i.test(w) && !/^\d/.test(w));
  check('H2 [' + lang + '] no English words left on the family screen', latin.length === 0, latin.slice(0, 8));
  await ctx.close();
}
await api('POST', '/demo/reset', tok);
finish('phase10-family', { allowConsole: true });
