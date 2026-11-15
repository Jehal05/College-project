// Phase 17 (UI redesign): Health Copilot. Fixed questions, rule-based answers, no free text.
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
await p.getByRole('link', { name: 'Health Copilot' }).click();
await p.getByRole('heading', { name: 'Health Copilot', level: 1 }).waitFor({ timeout: 10000 });
let body = await p.innerText('body');
check('K1 says it is not an AI chatbot or a doctor, rules only, and shows the 112 line with a link', body.includes('not an AI chatbot') && body.includes('Rules only, no AI model') && body.includes('call 112 or 108') && (await p.getByRole('link', { name: 'Emergency Center' }).count()) >= 1);
check('K2 there is no free-text box for questions (only the topbar search exists) and six fixed questions', (await p.locator('main textarea').count()) === 0 && (await p.locator('main input[type=text], main input:not([type])').count()) === 0 && (await p.locator('main ul button').count()) === 6);
check('K3 before asking, it says no question was asked', body.includes('No question asked yet'));

for (let i = 0; i < 30 && !/--/.test('') && (await p.evaluate(() => document.body.innerText)).includes('Waiting'); i++) await sleep(500);
await sleep(4000); // let the live readings arrive
await p.getByRole('button', { name: 'How do my readings look right now?' }).click();
let a = await p.locator('[data-testid=cp-answer]').first().innerText();
check('K4 the readings answer names the sources and is marked rule-based and not reviewed', /Worked out from: your live readings, your usual ranges/.test(a) && a.includes('Rule-based, not reviewed by a clinician'));
check('K5 the readings answer uses observation wording (no diagnosis words)', /(Inside|Outside) your usual range|no readings|No usual range/i.test(a) && !/diagnosed|you have/i.test(a));
await p.getByRole('button', { name: 'What is missing from my profile?' }).click();
check('K6 a second answer appears on top and the first stays below', (await p.locator('[data-testid=cp-answer]').count()) === 2 && (await p.locator('[data-testid=cp-answer]').first().innerText()).includes('profile'));
await p.getByRole('button', { name: 'What could I ask my doctor?' }).click();
a = await p.locator('[data-testid=cp-answer]').first().innerText();
check('K7 doctor answer gives generic questions to ask (medicines, symptoms)', a.includes('list of all medicines') && a.includes('symptoms'));
await p.getByRole('button', { name: 'Who would be told in an emergency?' }).click();
check('K8 circle answer mentions the simulated SOS and a link to Care Circle', (await p.locator('[data-testid=cp-answer]').first().innerText()).includes('(simulated)') && (await p.locator('[data-testid=cp-answer]').first().getByRole('link', { name: 'Care Circle' }).count()) === 1);
for (const q of ['What records do I have?', 'How have my readings moved lately?']) await p.getByRole('button', { name: q }).click();
check('K9 only the last four answers are kept', (await p.locator('[data-testid=cp-answer]').count()) === 4);
check('K10 no horizontal scrolling (desktop)', await noOverflow(p));
await ctx.close();

ctx = await phone(browser); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/copilot');
await p.getByRole('heading', { name: 'Health Copilot', level: 1 }).waitFor({ timeout: 10000 });
await p.getByRole('button', { name: 'What could I ask my doctor?' }).click();
check('P1 phone layout fits 360 px with an answer open', await noOverflow(p));
await ctx.close();

ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); p = await newPage(ctx);
await signIn(p); await p.evaluate(`localStorage.setItem('ht.lang','gu')`);
await p.goto(BASE + '/copilot'); await p.waitForSelector('h1', { timeout: 10000 });
await p.locator('main ul button').nth(1).click();
body = await p.innerText('body');
check('G1 Gujarati page and answer have translated text and no raw keys', body.includes('કોપાયલટ') && !/\b(cp|overview\.item|consent)\.[a-zA-Z.]+/.test(body));
await ctx.close();
await browser.close();
finish();
