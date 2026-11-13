// Accessibility audit: opens every screen at 360 px in English, Hindi and Gujarati, runs axe-core,
// prints the problems found and exits with code 1 if any "serious" or "critical" one remains.
// Needs the built app (npm run preview) and the mock server running, plus Chrome: set CHROME_PATH.
//   CHROME_PATH=/usr/bin/google-chrome npm run audit
import fs from 'node:fs';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const APP = process.env.APP_URL || 'http://localhost:5173';
const API = process.env.API_URL || 'http://localhost:4000';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const LANGS = ['en', 'hi', 'gu'];
const GET_HELP = LANGS.map((l) => JSON.parse(fs.readFileSync(new URL('../src/i18n/' + l + '.json', import.meta.url), 'utf8'))['symptoms.getHelp']);
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

const call = (path, token, body) => fetch(API + path, {
  method: body ? 'POST' : 'GET',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then((r) => r.json());

// Each screen: a name, the address, and whether to sign in first.
async function screens(token) {
  const countdown = await call('/emergencies', token, { patient_id: 'pat_001', type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH'] });
  const running = await call('/demo/scenario', token, { type: 'STROKE' });
  const passport = await call('/patients/pat_001/passport', token, { hours: 24 });
  const done = await call('/emergencies', token, { patient_id: 'pat_001', type: 'HEART', symptoms: ['CHEST_PAIN'] });
  await call('/emergencies/' + done.id + '/sos', token, { location: { lat: 21.17, lng: 72.83 } });
  const text = (page, label) => page.evaluate((l) => { const e = [...document.querySelectorAll('button,summary,a')].find((x) => x.textContent.includes(l)); if (e) e.click(); }, label);
  const inApp = (page, path) => page.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')); }, path);
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  return [
    { name: 'home (trends)', path: '/', wait: 6000 },
    { name: 'reminders', path: '/reminders' }, { name: 'record (summary)', path: '/summary/' + done.id, wait: 2500 },
    { name: 'emergency (why this alert open)', path: '/emergency/' + done.id, run: async (page) => { await pause(1500); await page.evaluate(() => { const e = [...document.querySelectorAll('button,summary')].find((x) => /Why this alert|यह अलर्ट क्यों|આ એલર્ટ કેમ/.test(x.textContent)); if (e) e.click(); }); } },
    { name: 'safety check-in', path: '/demo', run: async (page) => { await pause(1500); await page.evaluate(() => { const b = document.querySelector('section[aria-labelledby=demo-sim] button'); if (b) b.click(); }); await pause(800); } },
    { name: 'sms card (no data connection)', path: '/demo', run: async (page) => { await pause(1500); await page.evaluate(() => document.querySelector('[role=switch][aria-labelledby=sim-offline]')?.click()); await inApp(page, '/symptoms'); await pause(800); await page.click('[role=radio]'); await pause(300); await page.evaluate(() => { const c = document.querySelector('input[type=checkbox]'); if (c) c.click(); }); await page.evaluate((labels) => { const e = [...document.querySelectorAll('button')].find((x) => labels.some((l) => x.textContent.includes(l))); if (e) e.click(); }, GET_HELP); await pause(1500); } },
    { name: 'login', path: '/login', signedIn: false },
    { name: 'home', path: '/' }, { name: 'profile', path: '/profile' }, { name: 'consent', path: '/consent' },
    { name: 'contacts', path: '/contacts' }, { name: 'reports', path: '/reports' },
    { name: 'symptoms', path: '/symptoms', click: '[role=radio]' }, { name: 'demo', path: '/demo' },
    { name: 'passport', path: '/passport' }, { name: 'responder page', path: '/p/' + passport.token, signedIn: false },
    { name: 'emergency (countdown)', path: '/emergency/' + countdown.id },
    { name: 'emergency (response)', path: '/emergency/' + running.id }, { name: 'cancelled', path: '/cancelled' },
  ];
}

async function audit(browser, session, lang, screen) {
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740 });
  await page.evaluateOnNewDocument((code, saved) => {
    localStorage.setItem('ht.lang', code);
    if (saved) sessionStorage.setItem('healthtwin_session', JSON.stringify(saved));
  }, lang, screen.signedIn === false ? null : session);
  await page.goto(APP + screen.path, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, screen.wait || 1800));
  if (screen.click) await page.click(screen.click);
  if (screen.run) await screen.run(page);
  await page.evaluate(axeSource);
  const found = await page.evaluate(async (tags) => {
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, example: v.nodes[0].target.join(' ') }));
  }, TAGS);
  await page.close();
  return found;
}

const session = { ...(await call('/auth/login', null, { email: 'patient@demo.test', password: 'demo1234' })) };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const rows = [];
for (const screen of await screens(session.token)) {
  for (const lang of LANGS) {
    for (const v of await audit(browser, session, lang, screen)) rows.push({ screen: screen.name, lang, ...v });
  }
}
await browser.close();

const blocking = rows.filter((r) => r.impact === 'serious' || r.impact === 'critical');
console.log('screens x languages checked:', (await screens(session.token)).length, 'x', LANGS.length);
console.table(rows);
console.log(blocking.length ? 'FAIL: ' + blocking.length + ' serious/critical problems' : 'PASS: no serious or critical problems');
if (process.env.AUDIT_JSON) fs.writeFileSync(process.env.AUDIT_JSON, JSON.stringify(rows, null, 2));
process.exit(blocking.length ? 1 : 0);
