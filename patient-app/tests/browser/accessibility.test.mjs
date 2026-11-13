// Phase 4: keyboard-only use, skip link, focus, touch targets, 200% zoom, reduced motion, quiet announcements, crash screen.
// The crash screen test needs the dev server (TEST_DEV_URL); it is skipped when that is not set.
import { BASE, check, finish, freshState, launch, login, newPage, phone, sleep } from './helpers.mjs';

await freshState();
const browser = await launch(); const ctx = await phone(browser); const p = await newPage(ctx); await login(p);
await p.goto(BASE + '/'); await sleep(600); await p.keyboard.press('Tab');
check('A1 first Tab focuses the skip link', ((await p.evaluate('document.activeElement.textContent')) || '').toLowerCase().includes('skip'));
await p.keyboard.press('Enter'); await sleep(200); check('A2 skip link moves focus to main', (await p.evaluate('document.activeElement.id')) === 'main');
await p.goto(BASE + '/'); await sleep(800); await p.click("a[href='/profile']"); await sleep(900);
check('A3 route change focuses the page heading', (await p.evaluate('document.activeElement.tagName')) === 'H1');
await p.goto(BASE + '/symptoms'); await sleep(800);
const radio = p.getByRole('radio', { name: /Stroke/i }); if (await radio.count()) await radio.focus(); else await p.click('text=Stroke signs');
await p.keyboard.press('Space'); await sleep(300); await p.getByLabel('Face drooping').focus(); await p.keyboard.press('Space');
await p.getByRole('button', { name: /Get help now/ }).focus(); await p.keyboard.press('Enter'); await p.waitForURL('**/emergency/**', { timeout: 10000 });
check('A4 emergency started with the keyboard only', p.url().includes('/emergency/'));
await p.goto(BASE + '/profile'); await sleep(600); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await sleep(100);
check('A5 focus indicator visible', await p.evaluate("(()=>{const s=getComputedStyle(document.activeElement);return parseFloat(s.outlineWidth)>=2 || s.boxShadow!=='none'})()"));
for (const path of ['/', '/symptoms', '/profile', '/contacts', '/consent', '/passport']) {
  await p.goto(BASE + path); await sleep(800);
  const small = await p.evaluate(`[...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, [role=switch]')].filter(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&r.height<43.5&&!e.closest('label')&&!e.classList.contains('sr-only')}).map(e=>(e.textContent||e.getAttribute('aria-label')||e.tagName).trim().slice(0,25)+':'+Math.round(e.getBoundingClientRect().height))`);
  check('A6 touch targets are at least 44 px on ' + path, small.length === 0, small);
}
const z = await ctx.newPage(); await z.setViewportSize({ width: 180, height: 740 }); await z.goto(BASE + '/'); await sleep(800);
for (const path of ['/', '/symptoms', '/profile', '/demo', '/passport']) {
  await z.goto(BASE + path); await sleep(800);
  check('A7 no sideways scroll at 200% zoom on ' + path, await z.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'));
}
const rctx = await phone(browser, { reducedMotion: 'reduce' }); const q = await newPage(rctx); await login(q);
await q.goto(BASE + '/symptoms'); await sleep(600); await q.click('text=Stroke signs'); await q.getByLabel('Face drooping').check(); await q.click('text=Get help now'); await sleep(1200);
const t1 = await q.innerText('body'); await sleep(2500); const t2 = await q.innerText('body');
check('A8 reduced motion: the countdown still ticks', t1 !== t2);
check('A9 reduced motion is detected', await q.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"));
const live = await q.evaluate("[...document.querySelectorAll('[aria-live]')].map(e=>e.getAttribute('aria-live'))");
check('A10 few live regions on the emergency screen', live.length <= 3, live);
if (process.env.TEST_DEV_URL) {
  const dev = process.env.TEST_DEV_URL; const d = await newPage(await phone(browser)); await login(d, dev);
  await d.goto(dev + '/demo?crash=1'); await sleep(1000);
  check('A11 crash screen is an alert', (await d.locator('[role=alert]').count()) >= 1);
  check('A12 crash screen has tel:112', (await d.locator("a[href='tel:112']").count()) >= 1);
  check('A13 banner still visible on the crash screen', (await d.innerText('body')).toLowerCase().includes('simulat'));
  check('A14 no stack trace shown', !(await d.innerText('body')).includes('Deliberate'));
}
await browser.close(); finish('accessibility');
