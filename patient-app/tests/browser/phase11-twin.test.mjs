// Phase 11 (UI redesign): the desktop Overview, the Digital Twin in 2D and 3D, the organ list, focus, replay, and the phone bar.
import { chromium } from 'playwright-core';
import { BASE, CHROME, check, logs, finish, freshState, launch, newPage, phone, sleep, noOverflow } from './helpers.mjs';

await freshState();
const browser = await launch();
const desktop = (b, o = {}) => b.newContext({ viewport: { width: 1440, height: 900 }, ...o });
const signIn = async (p, lang) => {
  await p.goto(BASE + '/login'); if (lang) { await p.evaluate(`localStorage.setItem('ht.lang','${lang}')`); await p.reload(); }
  await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.includes('login'));
};
const noWebGL = `const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); };`;

// --- Overview on desktop ---
let ctx = await desktop(browser); let p = await newPage(ctx);
await signIn(p);
await p.waitForURL('**/overview', { timeout: 10000 }).catch(() => {});
check('O1 desktop "/" opens the Overview', p.url().endsWith('/overview'), p.url());
await p.getByText('Data completeness').waitFor({ timeout: 10000 });
let body = await p.innerText('body');
check('O2 shows the data-source badge, tiles, completeness and observations', body.includes('Simulated demo data') && body.includes('Heart rate') && body.includes('Data completeness') && body.includes('Observations from your usual ranges'));
check('O3 the sidebar lists the sections and marks the current page', (await p.getByRole('navigation', { name: 'Sections' }).getByRole('link').count()) === 12 && (await p.locator('nav[aria-label=Sections] a[aria-current=page]').innerText()).includes('Overview'));
check('O4 steps say they are not tracked (no invented number)', body.includes('Not tracked in this prototype'));
check('O5 no horizontal scrolling on desktop', await noOverflow(p));
await sleep(5000);
check('O6 a trend chart has a text summary naming the latest value', /Heart rate: latest \d+, lowest \d+, highest \d+ BPM/.test(await p.innerText('body')));
await ctx.close();

// --- Twin with 3D switched off (no WebGL): the 2D map, the list, focus, replay ---
ctx = await desktop(browser); await ctx.addInitScript(noWebGL); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/twin');
await p.getByRole('heading', { name: 'My Digital Twin' }).waitFor({ timeout: 10000 });
check('T1 without WebGL the 2D map is shown and the 3D button is disabled', (await p.locator('svg[role=img]').first().getAttribute('aria-label')).includes('Heart selected') && (await p.getByRole('button', { name: '3D view' }).isDisabled()));
await p.getByRole('button', { name: 'Lungs' }).click();
body = await p.innerText('body');
check('T2 choosing Lungs from the list shows its panel and updates the map label', body.includes('SpO2') && (await p.locator('svg[role=img]').first().getAttribute('aria-label')).includes('Lungs selected'));
await p.getByRole('button', { name: 'Kidneys' }).click(); body = await p.innerText('body');
check('T3 an organ without live readings says so instead of inventing numbers', body.includes('no live readings for this organ') && body.includes('not available in this prototype yet'));
await p.getByRole('button', { name: 'Focus on this organ' }).click();
check('T4 focus mode is on and the button offers to show the whole body', (await p.getByRole('button', { name: 'Show whole body' }).getAttribute('aria-pressed')) === 'true');
check('T5 keyboard: the organ list buttons are reachable and pressed state is exposed', (await p.getByRole('button', { name: 'Heart' }).getAttribute('aria-pressed')) === 'false');
for (let i = 0; i < 40 && Number(await p.locator('input[type=range]').getAttribute('max')) < 3; i++) await sleep(500);
check('T6 replay has several readings to scrub through', Number(await p.locator('input[type=range]').getAttribute('max')) >= 3);
await p.getByRole('button', { name: 'Play' }).click(); await sleep(1500);
check('T7 playing the replay shows which reading is on screen', /Reading \d+ of \d+/.test(await p.innerText('body')));
await p.getByRole('button', { name: 'Back to live' }).click();
check('T8 "Back to live" returns to live readings', (await p.innerText('body')).includes('Showing live readings'));
check('T9 no horizontal scrolling on the Twin page (desktop)', await noOverflow(p));
await ctx.close();

// --- reduced motion: 2D is the default ---
ctx = await desktop(browser, { reducedMotion: 'reduce' }); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/twin'); await p.getByRole('heading', { name: 'My Digital Twin' }).waitFor({ timeout: 10000 });
check('R1 with reduced motion the 2D map is the default view', (await p.getByRole('button', { name: '2D body map' }).getAttribute('aria-pressed')) === 'true' && (await p.locator('svg[role=img]').count()) >= 1);
await ctx.close();

// --- 3D where the device can draw it (if this machine cannot, the page must say so and show 2D) ---
const gl = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
ctx = await desktop(gl); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/twin'); await p.getByRole('heading', { name: 'My Digital Twin' }).waitFor({ timeout: 10000 });
const ready = await p.waitForSelector('[data-ready=true]', { timeout: 20000 }).then(() => true, () => false);
const fallback = (await p.innerText('body')).includes('3D is not available on this device');
check('D1 the 3D body draws, or the page falls back to 2D with a message', ready || fallback, { ready, fallback });
if (ready) {
  check('D2 the 3D body has a text label and a hint', (await p.locator('[role=img][aria-label^="3D body"]').count()) === 1 && (await p.innerText('body')).includes('Drag to turn the body'));
  await p.getByRole('button', { name: 'Pancreas' }).click(); await sleep(500);
  check('D3 choosing an organ from the list updates the 3D label', (await p.locator('[role=img][aria-label^="3D body"]').getAttribute('aria-label')).includes('Pancreas selected'));
  await p.getByRole('button', { name: '2D body map' }).click(); await sleep(300);
  check('D4 switching to 2D removes the 3D view', (await p.locator('[data-ready=true]').count()) === 0 && (await p.locator('svg[role=img]').count()) >= 1);
}
await ctx.close(); await gl.close();

// --- Hindi on desktop: the sidebar is translated ---
ctx = await desktop(browser); await ctx.addInitScript(noWebGL); p = await newPage(ctx);
await signIn(p, 'hi'); await p.goto(BASE + '/twin'); await p.getByRole('heading', { name: 'मेरा डिजिटल ट्विन' }).waitFor({ timeout: 10000 });
body = await p.innerText('body');
check('H1 Hindi: sidebar, organ names and the simulated badge are in Hindi', body.includes('रोग जानकारी') && body.includes('हृदय') && body.includes('सिम्युलेटेड डेमो डेटा'));
await ctx.close();

// --- phone: five-item bottom bar, no sideways scrolling ---
ctx = await phone(browser); await ctx.addInitScript(noWebGL); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/twin'); await p.getByRole('heading', { name: 'My Digital Twin' }).waitFor({ timeout: 10000 });
const names = await p.locator('nav[aria-label="Main navigation"] a').allInnerTexts();
check('P1 the phone bar is Home, Twin, Monitor, Reports, Profile', JSON.stringify(names.map((s) => s.trim())) === JSON.stringify(['Home', 'Twin', 'Monitor', 'Reports', 'Profile']), names);
check('P2 no sideways scrolling on the Twin page (phone)', await noOverflow(p));
await p.goto(BASE + '/overview'); await p.getByText('Data completeness').waitFor({ timeout: 10000 });
check('P3 no sideways scrolling on the Overview (phone)', await noOverflow(p));
await ctx.close();

// The software graphics driver used on test machines prints performance notes; they say nothing about the app.
for (let i = logs.length - 1; i >= 0; i--) if (/GL Driver Message/.test(logs[i][1])) logs.splice(i, 1);
await browser.close();
finish('phase11-twin');
