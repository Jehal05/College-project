// Phase 4: service worker app shell, offline banner, saved copies, "Not sent yet" emergency and automatic sending.
import { BASE, check, finish, freshState, launch, login, newPage, phone, sleep } from './helpers.mjs';

await freshState();
const browser = await launch(); const ctx = await phone(browser); const p = await newPage(ctx); await login(p);
const start = async () => { await p.goto(BASE + '/symptoms'); await sleep(600); await p.click('text=Stroke signs'); await p.getByLabel('Face drooping').check(); await p.click('text=Get help now'); };
for (const path of ['/profile', '/consent', '/contacts', '/reports']) { await p.goto(BASE + path); await sleep(500); }
await p.goto(BASE + '/'); await sleep(1500);
check('O1 service worker active', await p.evaluate('navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active))'));

await ctx.setOffline(true); await p.goto(BASE + '/profile'); await sleep(1500);
let body = await p.innerText('body');
check('O2 app shell loads offline', /profile/i.test(body));
check('O3 offline banner mentions 112 / 108', body.includes('You are offline') && body.includes('112'));
check('O4 tel:112 link present offline', (await p.locator("a[href='tel:112']").count()) >= 1);
check('O5 saved-copy note', body.includes('Saved copy'));
check('O6 save button disabled offline', (await p.locator("button:has-text('Save')").count()) === 0 || (await p.locator("button:has-text('Save')").first().isDisabled()));
check('O7 saved profile still shows the name', (await p.locator('input').evaluateAll((els) => els.some((e) => (e.value || '').includes('Rahul')))) || body.includes('Rahul'));
await p.goto(BASE + '/consent'); await sleep(1000);
check('O8 consent switches disabled', (await p.locator('[role=switch]').evaluateAll((els) => els.length > 0 && els.every((e) => e.disabled))));
await p.goto(BASE + '/passport'); await sleep(1000);
check('O8b passport create is disabled offline', (await p.getByRole('button', { name: 'Create passport' }).count()) === 0 || (await p.getByRole('button', { name: 'Create passport' }).isDisabled()));

await start(); await sleep(1500); body = await p.innerText('body');
check("O9 offline emergency shows 'Not sent yet'", body.includes('Not sent yet'));
check('O10 no success wording', !/alert sent|hospital notified|help is on the way|Hospital has/i.test(body));
check('O11 call button present', (await p.locator("a[href='tel:112']").count()) >= 1);
check('O12 pending kept in sessionStorage', (await p.evaluate("sessionStorage.getItem('ht.pending')")) !== null);
await ctx.setOffline(false); await p.waitForURL('**/emergency/**', { timeout: 20000 });
check('O13 sent automatically when the connection returns', p.url().includes('/emergency/'));
check('O14 pending cleared', (await p.evaluate("sessionStorage.getItem('ht.pending')")) === null);

await p.goto(BASE + '/'); await sleep(500); await ctx.setOffline(true); await start(); await sleep(800);
await p.evaluate("const x=JSON.parse(sessionStorage.getItem('ht.pending')); x.created_at=new Date(Date.now()-11*60000).toISOString(); sessionStorage.setItem('ht.pending', JSON.stringify(x))");
await p.reload(); await sleep(500); await ctx.setOffline(false); await sleep(6000);
check('O15 stale pending is NOT sent automatically', !p.url().includes('/emergency/'), p.url());
check('O16 stale question is shown', (await p.innerText('body')).includes('more than 10 minutes'));
await p.getByRole('button', { name: 'Discard' }).click(); await sleep(500);
check('O17 discard clears pending', (await p.evaluate("sessionStorage.getItem('ht.pending')")) === null);

await p.goto(BASE + '/'); await sleep(600); await p.getByRole('button', { name: 'Sign out' }).click(); await p.waitForURL('**/login');
check('O18 sign-out clears saved copies and pending', (await p.evaluate("Object.keys(sessionStorage).filter(k=>k.startsWith('ht.cache')||k==='ht.pending').length")) === 0);
check('O19 no health data in localStorage', await p.evaluate("Object.keys(localStorage).every(k=>k==='ht.lang')"));
await browser.close(); finish('offline');
