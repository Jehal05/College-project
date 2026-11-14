// Phase 12 (UI redesign): Disease Intelligence (hub + detail) and Live Monitoring, desktop and phone.
import { BASE, check, finish, freshState, launch, newPage, phone, sleep, noOverflow } from './helpers.mjs';

await freshState();
const browser = await launch();
const signIn = async (p) => {
  await p.goto(BASE + '/login');
  await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.includes('login'));
};

let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let p = await newPage(ctx);
await signIn(p);
await p.goto(BASE + '/diseases');
await p.getByRole('heading', { name: 'Disease Intelligence' }).waitFor({ timeout: 10000 });
let body = await p.innerText('body');
check('D1 hub shows six areas, the data badge and the rules-not-diagnosis note', ['Cardiac', 'Neurological', 'Respiratory', 'Diabetes', 'Kidney', 'Liver'].every((n) => body.includes(n)) && body.includes('Simulated demo data') && body.includes('no risk score and no diagnosis'));
check('D2 every card has a data-quality chip and no card claims a risk', (await p.getByText(/Data quality:/).count()) >= 6 && !/risk of|you have|diagnosed/i.test(body));
check('D3 areas without live readings say so', (await p.getByText('No live readings').count()) >= 3);
check('D4 no horizontal scrolling (desktop hub)', await noOverflow(p));
await p.locator('a[href="/diseases/cardiac"]').click();
await p.getByRole('heading', { name: 'Cardiac', level: 1 }).waitFor({ timeout: 10000 });
body = await p.innerText('body');
check('D5 detail shows observation, quality and next steps to discuss with a doctor', body.includes('Automatic observation') && body.includes('Data quality and confidence') && body.includes('General next steps to discuss with a doctor'));
check('D6 detail states it is not a diagnosis', body.includes('Not a medical diagnosis'));
await p.goto(BASE + '/diseases/kidney'); await p.getByRole('heading', { name: 'Kidney', level: 1 }).waitFor({ timeout: 10000 });
check('D7 an area with no live metrics says nothing can be observed', (await p.innerText('body')).includes('nothing can be observed'));
await p.goto(BASE + '/diseases/nonsense');
check('D8 an unknown area shows the not-found page', !(await p.innerText('body')).includes('General next steps'));

await p.goto(BASE + '/monitor');
await p.getByRole('heading', { name: 'Live Monitoring', level: 1 }).waitFor({ timeout: 10000 });
for (let i = 0; i < 30 && !/Heart rate \d+ bpm/.test(await p.innerText('body')); i++) await sleep(500);
body = await p.innerText('body');
check('M1 shows the simulated label, the made-up-trace note and the live heart rate', body.includes('Simulated demo data') && body.includes('not a real ECG') && /Heart rate \d+ bpm/.test(body));
check('M2 the trace has a text alternative and the wearable status is shown', /Simulated heart rhythm trace at \d+ beats per minute/.test(await p.locator('canvas[role=img]').getAttribute('aria-label')) && body.includes('Wearable connected'));
check('M3 the canvas actually has drawn pixels', await p.evaluate(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; }));
check('M4 four trend charts and an events list with the not-saved note', (await p.locator('figure').count()) === 4 && body.includes('Kept only in this page'));
check('M5 no horizontal scrolling (desktop monitor)', await noOverflow(p));
await ctx.close();

// phone
ctx = await phone(browser); p = await newPage(ctx);
await signIn(p);
await p.goto(BASE + '/monitor'); await p.getByRole('heading', { name: 'Live Monitoring', level: 1 }).waitFor({ timeout: 10000 });
check('P1 phone monitor fits 360 px', await noOverflow(p));
await p.goto(BASE + '/diseases'); await p.getByRole('heading', { name: 'Disease Intelligence', level: 1 }).waitFor({ timeout: 10000 });
check('P2 phone hub fits 360 px', await noOverflow(p));
await ctx.close();

// reduced motion and Hindi
ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); p = await newPage(ctx);
await signIn(p); await p.evaluate(`localStorage.setItem('ht.lang','hi')`);
await p.goto(BASE + '/diseases/cardiac'); await p.waitForSelector('h1', { timeout: 10000 });
body = await p.innerText('body');
check('H1 Hindi detail page shows translated text and no raw keys', body.includes('हृदय') && !/\bdis\.[a-z]+\./.test(body));
await ctx.close();
await browser.close();
finish();
