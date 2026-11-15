// Phase 16 (UI redesign): Care Circle. Members, what they could see (only what is allowed), family activity.
import { BASE, check, finish, freshState, launch, newPage, phone, noOverflow } from './helpers.mjs';

await freshState();
const browser = await launch();
const signIn = async (p) => {
  await p.goto(BASE + '/login');
  await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.includes('login'));
};

let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let p = await newPage(ctx);
await signIn(p);
await p.getByRole('link', { name: 'Care Circle' }).click();
await p.getByRole('heading', { name: 'Care Circle', level: 1 }).waitFor({ timeout: 10000 });
await p.locator('[data-testid=cc-member]').first().waitFor({ timeout: 10000 });
let body = await p.innerText('body');
check('C1 lists the emergency contacts as the circle, each with the SOS (simulated) line', (await p.locator('[data-testid=cc-member]').count()) >= 1 && body.includes('alert message if you send an SOS (simulated)'));
check('C2 the primary contact is listed first and marked', /Primary/.test(await p.locator('[data-testid=cc-member]').first().innerText()));
check('C3 says acknowledgements are not tracked and sharing is the same for everyone', body.includes('does not track whether a person saw') && body.includes('same for everyone in your circle'));
await p.getByText('Live vitals').first().waitFor({ timeout: 10000 });
check('C4 shows all four consent items as either can see or hidden', ((await p.getByText('Can see').count()) + (await p.getByText('Hidden', { exact: true }).count())) === 4);
check('C5 shows the family section and the link to the full access list', body.includes('When family last looked') && (await p.getByRole('link', { name: /who saw my data/i }).count()) === 1);

await p.goto(BASE + '/care-circle'); await p.getByRole('heading', { name: 'Care Circle', level: 1 }).waitFor();
check('C7 no horizontal scrolling (desktop)', await noOverflow(p));
await ctx.close();

ctx = await phone(browser); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/care-circle');
await p.getByRole('heading', { name: 'Care Circle', level: 1 }).waitFor({ timeout: 10000 });
check('P1 phone layout fits 360 px', await noOverflow(p));
await ctx.close();

ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); p = await newPage(ctx);
await signIn(p); await p.evaluate(`localStorage.setItem('ht.lang','hi')`);
await p.goto(BASE + '/care-circle'); await p.waitForSelector('h1', { timeout: 10000 });
body = await p.innerText('body');
check('H1 Hindi page has translated text and no raw keys', body.includes('सर्कल') && !/\bcc\.[a-zA-Z.]+/.test(body));
await ctx.close();
await browser.close();
finish();
