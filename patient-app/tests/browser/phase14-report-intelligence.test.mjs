// Phase 14 (UI redesign): Report Intelligence. Values reach the Twin only after confirmation; "not reviewed" is always shown.
import { BASE, check, logs, finish, freshState, launch, newPage, phone, noOverflow } from './helpers.mjs';

await freshState();
const browser = await launch();
const signIn = async (p) => {
  await p.goto(BASE + '/login');
  await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.includes('login'));
};
const wait = (p, text) => p.getByText(text).first().waitFor({ timeout: 10000 });

let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let p = await newPage(ctx);
await signIn(p);
await p.getByRole('link', { name: 'Health Reports' }).click();
await p.getByRole('heading', { name: 'Health Reports', level: 1 }).waitFor({ timeout: 10000 });
let body = await p.innerText('body');
check('R1 the sidebar opens Report Intelligence and it says the prototype cannot read files by itself', p.url().endsWith('/report-intelligence') && body.includes('cannot read your files by itself'));
check('R2 nothing is confirmed yet and the device-only note is shown', body.includes('You have not confirmed any values yet') && body.includes('Saved only on this device'));

// validation
await p.getByRole('button', { name: 'Review before adding' }).click();
check('R3 an empty value is refused with a message', (await p.getByText('Please fill this in.').count()) >= 1);
await p.getByLabel('Value', { exact: true }).fill('-4'); await p.getByRole('button', { name: 'Review before adding' }).click();
check('R4 a negative value is refused', (await p.getByText('Enter a number above 0.').count()) === 1);

// enter -> review -> NOT yet on the Twin
await p.locator('form select').first().selectOption('creatinine');
await p.getByLabel('Value', { exact: true }).fill('1.6');
await p.getByLabel(/Lowest value/).fill('0.6'); await p.getByLabel(/Highest value/).fill('1.2');
await p.getByRole('button', { name: 'Review before adding' }).click();
await wait(p, 'Please check this value');
check('R5 the review step shows the value and asks to confirm', (await p.innerText('body')).includes('Creatinine: 1.6 mg/dL'));
check('R6 before confirming the value is NOT saved or listed', (await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ht.labs.')).map((k) => localStorage.getItem(k)).join('')).then((s) => !s.includes('1.6'))) && (await p.innerText('body')).includes('You have not confirmed any values yet'));
await p.getByRole('button', { name: 'Edit' }).click();
check('R7 Edit goes back to the form without saving', (await p.getByLabel('Value', { exact: true }).inputValue()) === '1.6');
await p.getByRole('button', { name: 'Review before adding' }).click();
await p.getByRole('button', { name: 'Confirm and add to my Twin' }).click();
await wait(p, 'Added to your Twin.');
body = await p.innerText('body');
check('R8 after confirming it is listed with the printed range, outside status and "not reviewed"', body.includes('Creatinine') && body.includes('1.6') && body.includes('Outside the range on your report') && body.includes('Clinician review: not reviewed'));
check('R9 the app never calls the value normal or abnormal by itself', !/\b(abnormal|normal range|diagnos(is|ed) with|you have)\b/i.test(body.replace('Not a medical diagnosis', '')));

// shows on the Twin and in Disease Intelligence
await p.goto(BASE + '/twin'); await p.getByRole('button', { name: 'Kidneys' }).click();
await wait(p, 'Values you confirmed from reports');
check('R10 the Twin shows the confirmed value on the kidneys panel', (await p.innerText('body')).includes('Creatinine'));
await p.goto(BASE + '/diseases/kidney'); await wait(p, 'Values you confirmed from reports');
check('R11 Disease Intelligence shows it and no longer says "no related report" as a reason', (await p.innerText('body')).includes('Creatinine') && !(await p.innerText('body')).includes('No related report is uploaded'));

// delete
await p.goto(BASE + '/report-intelligence'); await wait(p, 'Outside the range on your report');
await p.getByRole('button', { name: 'Delete Creatinine' }).click();
check('R12 a confirmed value can be deleted', (await p.innerText('body')).includes('You have not confirmed any values yet'));
check('R13 no horizontal scrolling (desktop)', await noOverflow(p));
await ctx.close();

ctx = await phone(browser); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/report-intelligence');
await p.getByRole('heading', { name: 'Health Reports', level: 1 }).waitFor({ timeout: 10000 });
check('P1 phone layout fits 360 px', await noOverflow(p));
await ctx.close();

ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); p = await newPage(ctx);
await signIn(p); await p.evaluate(`localStorage.setItem('ht.lang','hi')`);
await p.goto(BASE + '/report-intelligence'); await p.waitForSelector('h1', { timeout: 10000 });
body = await p.innerText('body');
check('H1 Hindi page has translated text and no raw keys', body.includes('रिपोर्ट') && !/\b(ri|lab)\.[a-zA-Z_.]+/.test(body));
await ctx.close();
await browser.close();
for (let i = logs.length - 1; i >= 0; i--) if (/GL Driver Message/.test(logs[i][1])) logs.splice(i, 1); // software WebGL noise from the Twin page
finish();
