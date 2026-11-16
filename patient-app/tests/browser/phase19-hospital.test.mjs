// Phase 19: the hospital-website look: light by default, utility bar with plain tel: links, hero, quick actions, breadcrumb, footer, About accessibility notes.
import { BASE, api, check, finish, freshState, launch, logs, newPage, noOverflow, phone, sleep } from './helpers.mjs';

const tok = await freshState();
const browser = await launch();
const signIn = async (p) => { await p.goto(BASE + '/login'); await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL((u) => !u.pathname.includes('login')); };

// Desktop
let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/overview'); await p.getByRole('heading', { level: 1 }).waitFor({ timeout: 10000 });
check('H1 a first visit is light (no saved theme)', (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light');
check('H2 the utility bar has plain tel: links for 112 and 108', (await p.locator('a[href="tel:112"]').count()) === 1 && (await p.locator('a[href="tel:108"]').count()) === 1 && (await p.innerText('body')).includes('Simulated demo'));
check('H3 the hero is the page heading and says it is a simulation', (await p.getByRole('heading', { level: 1 }).count()) === 1 && (await p.innerText('body')).includes('nothing here is a diagnosis'));
const qa = p.getByRole('region', { name: 'Quick actions' });
check('H4 four quick actions lead to Emergency, Records, Care Circle and Simulator', (await qa.getByRole('link').count()) === 4);
const hrefs = await qa.getByRole('link').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
check('H5 the quick action addresses are right', JSON.stringify(hrefs) === JSON.stringify(['/emergency-center', '/report-intelligence', '/care-circle', '/simulator']), hrefs);
const foot = p.locator('footer');
check('H6 the footer says it is not medical advice and links to privacy, accessibility and credits', (await foot.innerText()).includes('Not medical advice. Not a medical device.') && (await foot.locator('a[href="/consent"]').count()) === 1 && (await foot.locator('a[href="/about#accessibility"]').count()) === 1 && (await foot.locator('a[href="/about"]').count()) === 1);
check('H7 no horizontal scrolling on desktop', await noOverflow(p));
await p.goto(BASE + '/twin'); await p.getByRole('heading', { name: 'My Digital Twin' }).waitFor({ timeout: 10000 });
const crumb = p.getByRole('navigation', { name: 'You are here' });
check('H8 other pages show a breadcrumb with Home and the current page', (await crumb.innerText()).includes('Home') && (await crumb.locator('[aria-current=page]').innerText()).includes('My Digital Twin'));
await p.goto(BASE + '/about'); await p.getByRole('heading', { name: 'Accessibility' }).waitFor({ timeout: 10000 });
check('H9 the About page has an accessibility section that admits drafts need review', (await p.innerText('body')).includes('have not yet been reviewed by native speakers'));
await p.evaluate(() => localStorage.setItem('ht.theme', 'dark')); await p.goto(BASE + '/overview'); await p.getByRole('heading', { level: 1 }).waitFor({ timeout: 10000 });
check('H10 the dark theme still works and keeps the footer', (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark' && (await p.locator('footer').count()) === 1);
await ctx.close();

// Phone, in Hindi (the patient's saved language is Hindi)
await api('PATCH', '/patients/PT-2026-0417', tok, { language: 'hi' });
ctx = await phone(browser); p = await newPage(ctx);
await p.goto(BASE + '/login');
await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]'); await p.waitForURL((u) => !u.pathname.includes('login'));
await p.goto(BASE + '/overview'); await p.getByRole('heading', { level: 1 }).waitFor({ timeout: 10000 }); await sleep(500);
const body = await p.innerText('body');
check('H11 on a phone in Hindi the utility bar, quick actions and footer are translated', body.includes('112 पर कॉल करें') && body.includes('सिम्युलेटेड डेमो') && body.includes('गोपनीयता और सहमति'), body.slice(0, 300));
check('H12 no horizontal scrolling on a phone in Hindi', await noOverflow(p));
await api('PATCH', '/patients/PT-2026-0417', tok, { language: 'en' });
await ctx.close(); await browser.close();
for (let i = logs.length - 1; i >= 0; i--) if (/GL Driver Message/.test(logs[i][1])) logs.splice(i, 1);
finish();
