// Phase 18: the real human body in the digital twin: model file, layers, organ status words, focus, credits and the About page.
import { chromium } from 'playwright-core';
import { BASE, CHROME, check, logs, finish, freshState, newPage, sleep } from './helpers.mjs';

await freshState();
const gl = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await gl.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await newPage(ctx);
await p.goto(BASE + '/login'); await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
await p.waitForURL((u) => !u.pathname.includes('login'));

// The model file: present, small, a real glTF binary.
const file = await p.evaluate(async () => { const r = await fetch('/models/body.glb'); const b = new Uint8Array(await r.arrayBuffer()); return { ok: r.ok, bytes: b.length, magic: String.fromCharCode(...b.slice(0, 4)) }; });
check('M1 the body model is served, is a glTF binary and is under 3 MB', file.ok && file.magic === 'glTF' && file.bytes < 3 * 1024 * 1024, file);

await p.goto(BASE + '/twin'); await p.getByRole('heading', { name: 'My Digital Twin' }).waitFor({ timeout: 10000 });
const canDraw = await p.evaluate(() => { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); });
const ready = await p.waitForSelector('[data-ready=true]', { timeout: 40000 }).then(() => true, () => false);
check('M2 where this browser can draw 3D, the real body model loads and draws', !canDraw || ready, { canDraw, ready });
if (canDraw && ready) {
  let body = await p.innerText('body');
  check('M3 every organ in the list says its status in words', ['Heart', 'Brain', 'Lungs', 'Kidneys', 'Liver', 'Pancreas'].every((n) => body.includes(n)) && /No live data/.test(body) && /(Usual|Waiting|May need attention)/.test(body));
  check('M4 the note says it is a generic illustration and links to the credits', body.includes('Generic anatomy illustration. It is not a scan of your body.') && (await p.getByRole('link', { name: 'Model credits' }).count()) === 1);
  const layerBtn = (n) => p.getByRole('group', { name: 'Layers' }).getByRole('button', { name: n });
  check('M5 default layers: skin and organs on, skeleton and vessels off', (await layerBtn('Skin').getAttribute('aria-pressed')) === 'true' && (await layerBtn('Organs').getAttribute('aria-pressed')) === 'true' && (await layerBtn('Skeleton').getAttribute('aria-pressed')) === 'false' && (await layerBtn('Blood vessels').getAttribute('aria-pressed')) === 'false');
  await layerBtn('Skeleton').click(); await sleep(300);
  check('M6 a layer button toggles and keeps the page drawn', (await layerBtn('Skeleton').getAttribute('aria-pressed')) === 'true' && (await p.locator('[data-ready=true]').count()) === 1);
  await p.getByRole('button', { name: 'Back', exact: true }).click(); await sleep(300);
  check('M7 the Back button is pressed (turns the body round)', (await p.getByRole('button', { name: 'Back', exact: true }).getAttribute('aria-pressed')) === 'true');
  await p.getByRole('button', { name: 'Liver' }).click(); await p.getByRole('button', { name: 'Focus on this organ' }).click(); await sleep(1500);
  check('M8 focusing a chosen organ keeps the 3D label and the button flips', (await p.locator('[role=img][aria-label^="3D body"]').getAttribute('aria-label')).includes('Liver selected') && (await p.innerText('body')).includes('Show whole body'));
}
await p.goto(BASE + '/about'); await p.getByRole('heading', { name: 'About the 3D body' }).waitFor({ timeout: 10000 });
const about = await p.innerText('body');
check('M9 the About page credits BodyParts3D under CC BY 4.0 and says what the body is not', about.includes('BodyParts3D, © The Database Center for Life Science') && about.includes('CC BY 4.0') && about.includes('not a scan of you') && about.includes('never diagnoses'));
check('M10 the credit links open the licence, the paper and the packaging', (await p.locator('a[href="https://creativecommons.org/licenses/by/4.0/"]').count()) === 1 && (await p.locator('a[href="https://doi.org/10.1093/nar/gkn613"]').count()) === 1 && (await p.locator('a[href="https://github.com/ashemag/human-atlas"]').count()) === 1);
for (let i = logs.length - 1; i >= 0; i--) if (/GL Driver Message|GPU stall|swiftshader/i.test(logs[i][1])) logs.splice(i, 1);
check('M11 no unexpected console errors or warnings', logs.length === 0, logs);
await ctx.close(); await gl.close();
finish();
