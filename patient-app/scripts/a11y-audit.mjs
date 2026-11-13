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
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

const call = (path, token, body) => fetch(API + path, {
  method: body ? 'POST' : 'GET',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then((r) => r.json());

// Each screen: a name, the address, and whether to sign in first.
async function screens(token) {
  const countdown = await call('/emergencies', token, { patient_id: 'HT-1001', type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH'] });
  const running = await call('/demo/scenario', token, { type: 'STROKE' });
  return [
    { name: 'login', path: '/login', signedIn: false },
    { name: 'home', path: '/' }, { name: 'profile', path: '/profile' }, { name: 'consent', path: '/consent' },
    { name: 'contacts', path: '/contacts' }, { name: 'reports', path: '/reports' },
    { name: 'symptoms', path: '/symptoms', click: '[role=radio]' }, { name: 'demo', path: '/demo' },
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
  await new Promise((r) => setTimeout(r, 1800));
  if (screen.click) await page.click(screen.click);
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
