// Takes a screenshot of every main screen at 360x740 (default English; LANGS=en,hi,gu for more).
//   OUT=/tmp/before node scripts/screenshots.mjs        (needs the mock on API_URL and a DEMO build on APP_URL)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const APP = process.env.APP_URL || 'http://localhost:5173', API = process.env.API_URL || 'http://localhost:4000';
const OUT = process.env.OUT || '/tmp/shots', LANGS = (process.env.LANGS || 'en').split(','), FONT = process.env.FONT_SCALE || '';
fs.mkdirSync(OUT, { recursive: true });
const api = async (m, p, t, b) => (await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) })).json().catch(() => ({}));
const tok = (await api('POST', '/auth/login', null, { email: 'patient@demo.test', password: 'demo1234' })).token;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });

for (const lang of LANGS) {
  await api('POST', '/demo/reset', tok); await api('PATCH', '/patients/PT-2026-0417', tok, { language: lang });
  const done = await api('POST', '/emergencies', tok, { patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH'] });
  await api('POST', '/emergencies/' + done.id + '/sos', tok, { location: { lat: 23.0225, lng: 72.5714 } });
  const pass = await api('POST', '/patients/PT-2026-0417/passport', tok, { hours: 24 });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, geolocation: { latitude: 23.0225, longitude: 72.5714 }, permissions: ['geolocation'] });
  const p = await ctx.newPage();
  const shot = async (name, full = false) => { await sleep(900); if (full) await p.addStyleTag({ content: '.safe-bottom.sticky{position:static !important}' }).catch(() => {}); await p.screenshot({ path: OUT + '/' + lang + '-' + name + '.png', fullPage: full }); };
  if (FONT) await p.addInitScript('document.addEventListener("DOMContentLoaded",()=>{document.documentElement.style.fontSize="' + FONT + '"})');
  await p.goto(APP + '/login'); await shot('01-login');
  await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(APP + '/');
  await p.waitForFunction(() => document.querySelectorAll('svg[role=img][aria-label]').length >= 4, null, { timeout: 15000 }).catch(() => {});
  await shot('02-home', true);
  for (const [n, path] of [['04-profile', '/profile'], ['05-consent', '/consent'], ['06-contacts', '/contacts'], ['07-reports', '/reports'], ['08-reminders', '/reminders'], ['09-passport', '/passport'], ['10-summary', '/summary/' + done.id], ['14-access', '/access']]) {
    await p.goto(APP + path); await shot(n, true);
  }
  await p.goto(APP + '/p/' + pass.token); await shot('11-responder', true);
  await p.goto(APP + '/symptoms'); await p.click('text=/Heart|हृदय|છાતી|हार्ट/').catch(() => {}); await p.locator('input[type=checkbox]').first().check().catch(() => {}); await shot('03-symptoms', true);
  await p.locator('input[type=checkbox]').nth(1).check().catch(() => {});
  await p.getByRole('button').filter({ hasText: /./ }).last().click().catch(() => {}); // the primary "Get help now" button is last
  await p.waitForURL(/\/emergency\//, { timeout: 8000 }).catch(() => {});
  await shot('12-emergency-countdown');
  const skip = p.locator('button').nth(1); await skip.click().catch(() => {});
  await sleep(9000); await shot('13-emergency-after-sos', true);
  await ctx.close();
}
await api('PATCH', '/patients/PT-2026-0417', tok, { language: 'en' });
await browser.close(); console.log('screenshots in ' + OUT);
