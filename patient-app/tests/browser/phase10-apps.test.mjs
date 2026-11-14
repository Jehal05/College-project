// Phase 10: the volunteer responder screens and the admin screen. Sign-up starts unverified, an admin verifies, alerts show no identity
// until accepted, accepted details follow the patient's consent, a changed text is not approved until an admin approves it,
// a disabled account cannot sign in, and every role stays on its own screens.
import { createRequire } from 'node:module';
import { BASE, api, check, finish, freshState, launch, newPage, phone, sleep } from './helpers.mjs';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const serious = (page) => page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
const tok = await freshState();
const browser = await launch();
const signIn = async (p, email, pw = 'demo1234') => { await p.goto(BASE + '/login'); await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw); await p.click('button[type=submit]'); };
const waitText = async (p, test, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const body = await p.innerText('body'); if (test(body)) return body; await sleep(300); } return p.innerText('body'); };
const mail = 'vol' + Date.now() + '@demo.test';

// --- volunteer sign-up ---
let ctx = await phone(browser); let p = await newPage(ctx);
await p.goto(BASE + '/login'); await p.getByRole('link', { name: 'Become a volunteer responder' }).click(); await p.waitForURL(BASE + '/volunteer');
let body = await waitText(p, (b) => b.includes('Full name'));
check('V1 the sign-up page explains an admin checks the account first', body.includes('an admin checks your account'));
await p.getByLabel('Full name').fill('Asha Volunteer'); await p.getByLabel('Email').fill(mail); await p.getByLabel('Password (at least 8 characters)').fill('short'); await p.getByRole('button', { name: 'Sign up' }).click();
body = await waitText(p, (b) => b.includes('at least 8 characters.'));
check('V2 a short password is refused with a plain message', body.includes('Please fill in every field'));
await p.getByLabel('Password (at least 8 characters)').fill('volunteer-pass-1'); await p.getByRole('button', { name: 'Sign up' }).click(); body = await waitText(p, (b) => b.includes('Thank you'));
check('V3 sign-up works and says an admin must verify', body.includes('An admin will verify your account'));
await p.getByRole('link', { name: 'Back to sign in' }).click(); await p.waitForURL(BASE + '/login');
await signIn(p, mail, 'volunteer-pass-1'); await p.waitForURL(BASE + '/responder'); body = await waitText(p, (b) => b.includes('waiting for an admin'));
check('V4 an unverified volunteer sees the waiting message and no alerts', body.includes('waiting for an admin to verify') && (await p.locator('[data-testid=responder-alert]').count()) === 0);
await ctx.close();

// --- admin verifies the volunteer, disables a relative, and cannot disable themselves ---
ctx = await phone(browser, { bypassCSP: true }); p = await newPage(ctx);
const net = []; p.on('response', (r) => { if (r.status() >= 400) net.push(r.status() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '')); }); p.on('requestfailed', (r) => net.push('FAILED ' + r.url().replace(/^https?:\/\/[^/]+/, '') + ' ' + (r.failure() || {}).errorText));
await signIn(p, 'admin@demo.test'); await p.waitForURL(BASE + '/admin'); body = await waitText(p, (b) => b.includes(mail));
check('A1 admin lands on /admin and sees the new volunteer as not verified', body.includes('Accounts') && body.includes('Not verified'), JSON.stringify(net) + ' ' + (await p.url()));
const row = (email) => p.locator('[data-testid=admin-user][data-email="' + email + '"]');
await row(mail).getByRole('button', { name: 'Verify' }).click(); body = await waitText(p, async () => true); await sleep(800);
check('A2 Verify marks the volunteer as verified', (await row(mail).innerText()).includes('Verified') && !(await row(mail).innerText()).includes('Not verified'));
check('A3 passwords and tokens never appear on the admin screen', !/demo1234|volunteer-pass|Bearer|password/i.test((await p.innerText('body')).replace(/Password/g, '')));
await row('admin@demo.test').getByRole('button', { name: 'Disable' }).click(); body = await waitText(p, (b) => b.includes('cannot disable your own'));
check('A4 an admin cannot disable their own account', body.includes('You cannot disable your own account.'));
await row('family@demo.test').getByRole('button', { name: 'Disable' }).click(); await sleep(900);
check('A5 disabling a relative marks the account', (await row('family@demo.test').innerText()).includes('Disabled'));
// texts
const ed = p.locator('[data-testid=admin-content][data-type=first_aid_basics]');
check('A6 the unreviewed first-aid text is shown as not approved', (await ed.innerText()).includes('Not approved') && (await ed.innerText()).includes('Version 1'));
await ed.getByRole('button', { name: 'Edit' }).click(); await ed.locator('textarea').fill('Sample line one\nSample line two'); await ed.getByRole('button', { name: 'Save' }).click(); await sleep(900);
check('A7 a changed text goes to version 2 and stays not approved', (await ed.innerText()).includes('Version 2') && (await ed.innerText()).includes('Not approved'));
const asPatient = await api('GET', '/content/first_aid_basics', tok);
check('A8 apps cannot read the unapproved text', Boolean(asPatient.error) && !asPatient.items, asPatient);
await ed.getByRole('button', { name: 'Edit' }).click(); await ed.getByLabel('Approve this text').check(); await ed.getByRole('button', { name: 'Save' }).click(); await sleep(900);
check('A9 approving makes it version 3 and approved', (await ed.innerText()).includes('Version 3') && (await ed.innerText()).includes('Approved') && !(await ed.innerText()).includes('Not approved'));
await p.getByRole('button', { name: 'Refresh' }).click(); await sleep(900);
check('A10 the access log lists these admin actions', await (async () => { const t = await p.innerText('[data-testid=admin-audit]'); return t.includes('admin.user_update') && t.includes('content.update'); })());
await p.addScriptTag({ path: axePath });
check('A11 axe: no serious or critical problems on the admin screen', (await serious(p)).length === 0, await serious(p));
check('A12 a disabled relative cannot sign in', await (async () => { const c2 = await phone(browser); const p2 = await newPage(c2); await signIn(p2, 'family@demo.test'); await sleep(1000); const ok = p2.url() === BASE + '/login' && (await p2.innerText('body')).includes('Sign in'); await c2.close(); return ok; })());
check('A13 the admin cannot open patient or relative screens (go back to /admin)', await (async () => { await p.goto(BASE + '/family'); await sleep(700); const a = p.url(); await p.goto(BASE + '/'); await sleep(700); return a === BASE + '/admin' && p.url() === BASE + '/admin'; })());
await ctx.close();

// --- the verified volunteer: alert without identity, accept with consent ---
ctx = await phone(browser, { bypassCSP: true }); p = await newPage(ctx);
await signIn(p, mail, 'volunteer-pass-1'); await p.waitForURL(BASE + '/responder'); body = await waitText(p, (b) => b.includes('No alerts right now'));
check('R1 a verified volunteer with nothing nearby sees "No alerts right now"', body.includes('No alerts right now.'));
const made = await api('POST', '/emergencies', tok, { patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN'] });
await api('POST', '/emergencies/' + made.id + '/sos', tok, { location: { lat: 23.0225, lng: 72.5714 } });
body = await waitText(p, (b) => b.includes('m away'));
check('R2 the alert shows without a reload: category and distance', body.includes('Heart or chest') && /\d+ m away/.test(body), body.slice(0, 200));
check('R3 before accepting there is no name, age, allergy or place', !/rahul|mehta|penicillin|23\.0225/i.test(body));
await p.addScriptTag({ path: axePath });
check('R4 axe: no serious or critical problems on the responder screen', (await serious(p)).length === 0, await serious(p));
await p.getByRole('button', { name: 'Accept' }).click(); body = await waitText(p, (b) => b.includes('You accepted'));
const patient = await p.innerText('[data-testid=responder-patient]');
check('R5 accepting shows the name and age the patient allowed', patient.includes('Rahul Mehta') && /Age \d+/.test(patient), patient);
check('R6 the place appears only because the location consent is on', patient.includes('Location: 23.0225, 72.5714'), patient);
check('R7 no phone number and no medical history other than allergies', !/\+91|amlodipine|metformin|hypertension|diabetes/i.test(patient));
await api('PUT', '/patients/PT-2026-0417/consents', tok, { location: false, history: false });
const rtok = (await api('POST', '/auth/login', null, { email: 'responder@demo.test', password: 'demo1234' })).token;
const noConsent = await api('POST', '/responders/' + made.id + '/accept', rtok);
check('C1 with the location and history consents off the server leaves out the place and allergies', Boolean(noConsent.patient) && !('location' in noConsent) && !('allergies' in noConsent.patient), noConsent);
await api('POST', '/emergencies/' + made.id + '/cancel', tok);
await api('PUT', '/patients/PT-2026-0417/consents', tok, { location: true, history: true });
check('R8 the responder cannot open admin or family screens', await (async () => { await p.goto(BASE + '/admin'); await sleep(700); const a = p.url(); await p.goto(BASE + '/family'); await sleep(700); return a === BASE + '/responder' && p.url() === BASE + '/responder'; })());
check('R9 a patient cannot open /admin', await (async () => { const c2 = await phone(browser); const p2 = await newPage(c2); await signIn(p2, 'patient@demo.test'); await p2.waitForURL(BASE + '/'); await p2.goto(BASE + '/admin'); await sleep(700); const ok = p2.url() === BASE + '/'; await c2.close(); return ok; })());
await p.getByRole('button', { name: 'Sign out' }).click(); await p.waitForURL(BASE + '/login');
await ctx.close();

// --- Hindi and Gujarati ---
for (const [lang, who, title] of [['hi', 'responder@demo.test', 'आपातकालीन स्वयंसेवक'], ['gu', 'responder@demo.test', 'કટોકટી સ્વયંસેવક']]) {
  await api('POST', '/demo/reset', tok);
  ctx = await phone(browser); p = await newPage(ctx);
  await p.goto(BASE + '/login'); await p.evaluate(`localStorage.setItem('ht.lang','${lang}')`); await p.reload();
  await p.fill('input[type=email]', who); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(BASE + '/responder');
  body = await waitText(p, (b) => b.includes(title));
  const latin = (body.match(/[A-Za-z][A-Za-z0-9_]*/g) || []).filter((w) => !/^(english|sos|healthtwin|ai|min)$/i.test(w) && !/^\d/.test(w));
  check('H1 [' + lang + '] the responder screen is translated with no English words', body.includes(title) && latin.length === 0, latin.slice(0, 8));
  await ctx.close();
  ctx = await phone(browser); p = await newPage(ctx);
  await p.goto(BASE + '/login'); await p.evaluate(`localStorage.setItem('ht.lang','${lang}')`); await p.reload();
  await p.fill('input[type=email]', 'admin@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(BASE + '/admin');
  const admTitle = lang === 'hi' ? 'एडमिन' : 'એડમિન';
  body = await waitText(p, (b) => b.includes(admTitle) && b.includes('admin@demo.test'));
  check('H2 [' + lang + '] the admin screen headings are translated', body.includes(admTitle) && body.includes(lang === 'hi' ? 'खाते' : 'ખાતાં') && body.includes(lang === 'hi' ? 'एक्सेस लॉग' : 'એક્સેસ લૉગ'));
  await ctx.close();
}
await api('POST', '/demo/reset', tok);
finish('phase10-apps', { allowConsole: true });
