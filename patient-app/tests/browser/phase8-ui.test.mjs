// Phase 8: the new look must not break layout, names, tap targets or the red-only-in-emergencies rule.
import { BASE, api, check, finish, freshState, launch, newPage, phone, sleep, unnamedControls } from './helpers.mjs';

const tok = await freshState();
const browser = await launch();
const SCREENS = ['/', '/profile', '/consent', '/contacts', '/reports', '/reminders', '/passport', '/symptoms'];
const noOverflow = (p) => p.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1');
// Visible buttons, links and form controls smaller than 44 px (ignores hidden, skip links and inline text links inside paragraphs).
const smallTargets = (p) => p.evaluate(`[...document.querySelectorAll('button,a[href],select,input:not([type=hidden]):not([type=file]),[role=radio],[role=switch]')].filter(e=>{
  const r=e.getBoundingClientRect(); const s=getComputedStyle(e); if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none') return false;
  if(e.closest('p,li > span') && e.tagName==='A' && e.parentElement.tagName==='P') return false;
  if(e.type==='checkbox'||e.type==='radio') { const l=e.closest('label'); if(l){const lr=l.getBoundingClientRect(); return lr.height<44;} }
  return r.height<43.5 && !e.classList.contains('sr-only') && !/skip/i.test(e.textContent||'');}).map(e=>(e.tagName+' '+(e.innerText||e.getAttribute('aria-label')||'').slice(0,30)+' '+Math.round(e.getBoundingClientRect().height)))`);

// ---- 1. Overflow at 360 px, 130% font, in each language, on every main screen
for (const lang of ['en', 'hi', 'gu']) {
  await api('PATCH', '/patients/PT-2026-0417', tok, { language: lang });
const ctx = await phone(browser, { geolocation: { latitude: 23.0225, longitude: 72.5714 }, permissions: ['geolocation'] });
  await ctx.addInitScript("document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize='130%'})");
  const p = await newPage(ctx);
  await p.goto(BASE + '/login'); await p.evaluate(`localStorage.setItem('ht.lang','${lang}')`); await p.reload();
  check(`U1 [${lang}] login: no sideways scroll at 130% font`, await noOverflow(p));
  await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(BASE + '/');
  const bad = [];
  for (const path of SCREENS) { await p.goto(BASE + path); await sleep(700); if (!(await noOverflow(p))) bad.push(path); }
  check(`U2 [${lang}] no sideways scroll on ${SCREENS.length} screens at 130% font`, bad.length === 0, bad);
  await ctx.close();
}
await api('PATCH', '/patients/PT-2026-0417', tok, { language: 'en' });

// ---- 2. Names, tap targets, red scan (English, normal font)
// Red is allowed on the Home entry button (min-h-[88px]) and on active-emergency banners (role=status) only.
const redOn = (page, home) => page.evaluate((home) => [...document.querySelectorAll('[class]')].filter((e) => /(^|\s)(bg|text|border|ring|fill|stroke)-red-/.test(typeof e.className === 'string' ? e.className : '')
  && !(home && (e.className.includes('min-h-[88px]') || e.closest('[role=status]')))).map((e) => e.tagName + ':' + String(e.className).slice(-60)), home);
const lctx = await phone(browser); const lp = await newPage(lctx); await lp.goto(BASE + '/login'); await sleep(600);
check('U3 /login: every control has a name', (await unnamedControls(lp)).length === 0);
check('U4 /login: tap targets are at least 44 px', (await smallTargets(lp)).length === 0, await smallTargets(lp));
check('U5 /login: no emergency red outside the emergency flow', (await redOn(lp, false)).length === 0, await redOn(lp, false));
const lcall = await lp.locator("a[href='tel:112']").first().boundingBox();
check('U5b /login: Call 112 / 108 is >= 56 px', lcall.height >= 56, lcall);
await lctx.close();
const ctx = await phone(browser, { geolocation: { latitude: 23.0225, longitude: 72.5714 }, permissions: ['geolocation'] });
const p = await newPage(ctx);
await p.goto(BASE + '/login'); await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL(BASE + '/');
for (const path of ['/', '/profile', '/consent', '/contacts', '/reports', '/reminders', '/passport']) {
  await p.goto(BASE + path); await sleep(900);
  const unnamed = await unnamedControls(p); const small = await smallTargets(p); const red = await redOn(p, path === '/');
  check(`U3 ${path}: every control has a name`, unnamed.length === 0, unnamed);
  check(`U4 ${path}: tap targets are at least 44 px`, small.length === 0, small);
  // Emergency red may appear only on the Home entry button and active-emergency banners, never elsewhere.
  check(`U5 ${path}: no emergency red outside the emergency flow`, red.length === 0, red.slice(0, 4));
}
await p.goto(BASE + '/'); await sleep(900);
const hero = await p.locator("a[href='/symptoms']").first().boundingBox();
check('U6 Home: the Emergency help button is large and above the fold', hero.height >= 56 && hero.y + hero.height <= 740, hero);

// ---- 3. Emergency screens: Call 112 / 108 >= 56 px and visible without scrolling
await p.goto(BASE + '/symptoms'); await sleep(800);
let call = await p.locator("a[href='tel:112']").first().boundingBox();
check('U7 Symptoms: Call 112 / 108 is >= 56 px and visible without scrolling', call && call.height >= 56 && call.y + call.height <= 740, call);
await p.locator('[role=radio]').first().click(); await p.locator('input[type=checkbox]').first().check(); await p.locator('input[type=checkbox]').nth(1).check();
await p.getByRole('button').last().click(); await p.waitForURL(/\/emergency\//);
await sleep(800);
call = await p.locator("a[href='tel:112']").first().boundingBox();
check('U8 Countdown: Call 112 / 108 is >= 56 px and visible without scrolling', call && call.height >= 56 && call.y + call.height <= 740, call);
check('U9 Countdown: banner and named controls', (await p.innerText('body')).includes('Simulated event. Not a medical diagnosis.') && (await unnamedControls(p)).length === 0);
const cancel = await p.getByRole('button', { name: /I'm OK, cancel/ }).boundingBox();
check('U10 Countdown: cancel and send buttons are >= 56 px', cancel.height >= 56 && (await p.getByRole('button', { name: /Send now/ }).boundingBox()).height >= 56);
check('U11 Countdown: no sideways scroll', await noOverflow(p));
await p.getByRole('button', { name: /Send now/ }).click(); await p.waitForSelector('text=Alert sent', { timeout: 15000 });
call = await p.locator("a[href='tel:112']").first().boundingBox();
check('U12 After SOS: Call 112 / 108 is >= 56 px and in the first screen', call && call.height >= 56 && call.y < 740, call);
const words = (await p.innerText('body')).toLowerCase();
check('U13 After SOS: honest wording, no "help is on the way"', words.includes('alert sent') && !words.includes('help is on the way'));
check('U14 After SOS: no sideways scroll', await noOverflow(p));
finish('phase8-ui');
