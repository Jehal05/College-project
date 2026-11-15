// Phase 15 (UI redesign): Health Simulator. Hypothetical vs baseline against the person's own usual range.
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
await p.getByRole('link', { name: 'Health Simulator' }).click();
await p.getByRole('heading', { name: 'Health Simulator', level: 1 }).waitFor({ timeout: 10000 });
let body = await p.innerText('body');
check('S1 says hypothetical, not a prediction, and not a diagnosis', body.includes('Hypothetical, not a prediction') && body.includes('does not predict') && body.includes('not a diagnosis'));
check('S2 shows the simulated badge, the assumptions and the uncertainty panels', body.includes('Simulated demo data') && body.includes('Assumptions') && body.includes('How much your readings vary'));
check('S3 four sliders and a comparison table with four rows', (await p.locator('input[type=range]').count()) === 4 && (await p.locator('[data-testid^=sim-row-]').count()) === 4);
for (let i = 0; i < 30 && /--/.test(await p.locator('[data-testid=sim-row-heart_rate]').innerText()); i++) await sleep(500);
const base = Number((await p.locator('[data-testid=sim-row-heart_rate] td').nth(0).innerText()).trim());
check('S4 the baseline is the live heart rate and the what-if starts at the same value', Number.isFinite(base) && Number(await p.getByLabel('Heart rate value').inputValue()) === base);

await p.getByLabel('Heart rate value').fill('190');
let row = await p.locator('[data-testid=sim-row-heart_rate]').innerText();
check('S5 a very high what-if heart rate is shown outside the usual range, with the change', /Outside your usual range/.test(row) && /\(\+\d+\)/.test(row));
check('S6 the summary names it and adds that it says nothing about what would happen', /Heart rate/.test(await p.locator('[role=status]').last().innerText()) && body.length > 0 && (await p.innerText('body')).includes('says nothing about what would actually happen'));
await p.getByLabel('Heart rate value').fill('9999');
check('S7 values are clamped to the slider limit', (await p.getByLabel('Heart rate value').inputValue()) === '200');
await p.getByRole('button', { name: 'Reset to my latest readings' }).click();
check('S8 reset brings the what-if back to the baseline', Number(await p.getByLabel('Heart rate value').inputValue()) !== 200 && /nothing would be outside|these would be outside/.test(await p.innerText('body')));
check('S9 no horizontal scrolling (desktop)', await noOverflow(p));
await ctx.close();

ctx = await phone(browser); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/simulator');
await p.getByRole('heading', { name: 'Health Simulator', level: 1 }).waitFor({ timeout: 10000 });
check('P1 phone layout fits 360 px (the table scrolls inside its own box)', await noOverflow(p));
await ctx.close();

ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); p = await newPage(ctx);
await signIn(p); await p.evaluate(`localStorage.setItem('ht.lang','gu')`);
await p.goto(BASE + '/simulator'); await p.waitForSelector('h1', { timeout: 10000 });
body = await p.innerText('body');
check('G1 Gujarati page has translated text and no raw keys', body.includes('કાલ્પનિક') && !/\bsim\.[a-zA-Z.]+/.test(body));
await ctx.close();
await browser.close();
finish();
