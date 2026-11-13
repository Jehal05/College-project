// Phase 5: a real backend can answer 401 (login ended), 5xx (broken) or slowly. The app must stay calm and the call button must keep working.
import { BASE, api, check, finish, freshState, launch, login, newPage, phone, sleep } from './helpers.mjs';

const tok = await freshState();
const browser = await launch(); const ctx = await phone(browser); const p = await newPage(ctx); await login(p); await p.waitForSelector('text=Hello, Rahul');
const fail = (mode) => api('POST', '/demo/fail', tok, { mode });
const callLinks = () => p.locator("a[href='tel:112']").count();

// 5xx: friendly message with a retry, nothing crashes
await fail('server'); await p.goto(BASE + '/profile'); await p.waitForSelector('text=Could not load your profile.');
check('R1 5xx on Profile shows a friendly error with a retry button', (await p.getByRole('button', { name: 'Try again' }).count()) === 1 && !(await p.innerText('body')).includes('Simulated server error'));
await fail('off'); await p.getByRole('button', { name: 'Try again' }).click(); await p.waitForSelector("input[autocomplete='name']");
check('R2 retry works once the server is back', true);

// 5xx while starting an emergency: the call button stays, error text points to it
await fail('server'); await p.goto(BASE + '/symptoms'); await sleep(500); await p.click('text=Stroke signs'); await p.getByLabel('Face drooping').check(); await p.click('text=Get help now');
await sleep(1500); const body = await p.innerText('body');
check('R3 emergency creation failing keeps the call button and shows a clear message', (await callLinks()) >= 1 && /Could not start|Not sent yet/.test(body));
await fail('off'); await p.evaluate("sessionStorage.removeItem('ht.pending')");

// 401 on an emergency call must NOT sign the person out
await fail('expired'); await p.goto(BASE + '/symptoms'); await sleep(500); await p.click('text=Stroke signs'); await p.getByLabel('Face drooping').check(); await p.click('text=Get help now');
await sleep(1500);
check('R4 401 during an emergency call does not sign out and the call button stays', !p.url().includes('/login') && (await callLinks()) >= 1, p.url());
await fail('off');

// 401 on a normal screen: sign out with a clear message
await p.goto(BASE + '/'); await sleep(800); await fail('expired'); await p.goto(BASE + '/profile'); await p.waitForURL('**/login', { timeout: 8000 });
check('R5 401 signs out and the login screen says the session ended', (await p.innerText('body')).includes('Your session ended. Please sign in again.'));
check('R6 saved copies were cleared on the forced sign-out', (await p.evaluate("Object.keys(sessionStorage).filter(k=>k.startsWith('ht.cache')||k==='ht.pending').length")) === 0);
await fail('off'); await login(p); await p.waitForSelector('text=Hello, Rahul'); check('R7 signing in again works', true);

// Slow server: give up after 10 s and say so
await fail('slow'); const t0 = Date.now(); await p.goto(BASE + '/profile'); await p.waitForSelector('text=Could not load your profile.', { timeout: 20000 });
const secs = (Date.now() - t0) / 1000;
check('R8 a slow server is given up on after about 10 seconds', secs >= 9.5 && secs < 14, secs);
await fail('off');
await browser.close(); finish('resilience');
