// Phase 3: consent switches, contacts, reports, digital twin bar, time-since-alert clock, contacts notified, reset.
import { BANNER, BASE, api, check, finish, freshState, launch, login, newPage, noOverflow, phone, sleep, unnamedControls } from './helpers.mjs';

const tok = await freshState();
const browser = await launch(); const ctx = await phone(browser); const p = await newPage(ctx); await login(p); await p.waitForSelector('text=Hello, Rahul');
const clean = async () => (await noOverflow(p)) && (await unnamedControls(p)).length === 0;
const sw = (name) => p.getByRole('switch', { name }).getAttribute('aria-checked');
const toggle = async (name) => { await p.getByRole('switch', { name }).click(); await p.waitForSelector('text=Saved'); };

await p.click('nav >> text=Profile'); await p.waitForSelector('text=My profile');
for (const [link, heading] of [['Consent settings', 'Consent'], ['Emergency contacts', 'Emergency contacts'], ['Reports', 'Reports']]) {
  await p.locator("nav[aria-label='Your information'] >> text=" + link).click(); await p.waitForSelector(`h1:has-text('${heading}')`);
  check(`1 ${link} opens; banner; no overflow; controls named`, (await p.innerText('body')).includes(BANNER) && (await clean()));
  await p.click('text=Back'); await p.waitForSelector('text=My profile');
}

await p.goto(BASE + '/consent'); await p.waitForSelector("h1:has-text('Consent')");
const names = ['Location', 'Medical history', 'Live vitals', 'Reports'];
let allOn = true; for (const n of names) allOn = allOn && (await sw(n)) === 'true';
check('2 four named switches, all On', allOn);
check('2 intro says changes apply to the next emergency', (await p.innerText('body')).includes('Changes apply to your next emergency'));
await toggle('Reports'); check('3 saved, Off and logged', (await sw('Reports')) === 'false' && (await p.innerText('body')).includes('Reports: Off'));
await p.reload(); await p.waitForSelector("h1:has-text('Consent')"); check('3 survives reload', (await sw('Reports')) === 'false');
await toggle('Reports');
await p.route('**/patients/PT-2026-0417/consents', (r) => (r.request().method() === 'PUT' ? r.fulfill({ status: 500, body: '{}' }) : r.continue()));
await p.getByRole('switch', { name: 'Live vitals' }).click(); await p.waitForSelector('text=The switch was put back');
check('3 rollback and Retry shown', (await sw('Live vitals')) === 'true' && (await p.getByRole('button', { name: 'Retry' }).count()) === 1);
await p.unroute('**/patients/PT-2026-0417/consents'); await p.getByRole('button', { name: 'Retry' }).click(); await p.waitForSelector('text=Saved');
check('3 Retry works', (await sw('Live vitals')) === 'false'); await toggle('Live vitals');

await toggle('Location');
await p.goto(BASE + '/symptoms'); await p.click('text=Heart or chest'); await p.getByLabel('Chest pain or pressure').check(); await p.click('text=Get help now');
await p.waitForURL('**/emergency/EM-*'); const eid = p.url().split('/').pop(); await p.click('text=Send now'); await p.waitForSelector('text=Alert sent');
check('4 location-off message shown', (await p.locator('text=Location sharing is off in your consent settings').count()) === 1);
check('4 server stored no location', (await api('GET', '/emergencies/' + eid, tok)).location === null);
await p.waitForSelector('text=Your contacts were notified (simulated)', { timeout: 5000 });
const body = await p.innerText('body'); check('9 contacts notified card lists names', body.includes('Sunita Mehta') && body.includes('Karan Mehta'));
const clock = p.locator("section[aria-label='Time since alert']");
check('8 clock visible as mm:ss', /\d\d:\d\d/.test(await clock.innerText()));
await p.waitForSelector('text=The simulated emergency has ended.', { timeout: 12000 });
const t1 = await clock.innerText(); await sleep(2200); const t2 = await clock.innerText();
check('8 clock frozen after handover', t1 === t2); check('8 milestones have times', (t1.match(/\d\d:\d\d/g) || []).length >= 5);
await p.reload(); await p.waitForSelector("section[aria-label='Time since alert']");
check('8 clock after reload equals frozen value', (await clock.innerText()).split('\n')[1] === t1.split('\n')[1]);
await p.goto(BASE + '/consent'); await toggle('Location');

await p.goto(BASE + '/contacts'); await p.waitForSelector('text=Sunita Mehta');
const li = (n) => p.locator('li', { hasText: n });
await p.click("button:has-text('Add contact')"); await p.getByLabel('Name').fill('Meera Demo'); await p.getByLabel('Phone').fill('12ab'); await p.click("button:has-text('Save')");
check('5 relation and phone errors', (await p.locator('text=Choose a relation from the list').count()) === 1 && (await p.locator('text=/valid phone number/').count()) === 1);
await p.getByLabel('Relation').selectOption('Sibling'); await p.getByLabel('Phone').fill('+91 00000 00003'); await p.getByLabel('Make this my primary contact').check(); await p.click("button:has-text('Save')");
await p.waitForSelector('text=Meera Demo');
check('5 added and primary', (await li('Meera Demo').innerText()).includes('Primary') && !(await li('Sunita Mehta').innerText()).includes('Primary'));
await p.getByRole('button', { name: 'Edit Karan Mehta' }).click(); await p.getByLabel('Name').fill('Ravi Edited'); await p.click("button:has-text('Save')"); await p.waitForSelector('text=Ravi Edited');
await p.getByRole('button', { name: 'Make primary: Sunita Mehta' }).click(); await sleep(800);
check('5 make primary moves the marker', (await li('Sunita Mehta').innerText()).includes('Primary') && !(await li('Meera Demo').innerText()).includes('Primary'));
for (const n of ['Four', 'Five']) {
  await p.click("button:has-text('Add contact')"); await p.getByLabel('Name').fill(n + ' Demo'); await p.getByLabel('Relation').selectOption('Friend');
  await p.getByLabel('Phone').fill('+91 00000 0010' + n.length); await p.click("button:has-text('Save')"); await p.waitForSelector('text=' + n + ' Demo');
}
check('5 sixth blocked with a message', (await p.locator("button:has-text('Add contact')").isDisabled()) && (await p.locator('text=at most 5 contacts').count()) >= 1);
await p.getByRole('button', { name: 'Delete Sunita Mehta' }).click(); await p.waitForSelector('[role=alertdialog]');
check('5 confirm focus starts on the safe button', (await p.evaluate('document.activeElement.innerText')) === 'Cancel');
await p.click("button:has-text('Yes, delete')"); await p.waitForSelector('text=Sunita Mehta', { state: 'detached' });
let primaries = 0; for (const n of ['Meera Demo', 'Ravi Edited', 'Four Demo', 'Five Demo']) primaries += (await li(n).innerText()).includes('Primary') ? 1 : 0;
check('5 delete reassigns primary', primaries === 1); check('5 layout ok', await clean());

await p.goto(BASE + '/reports'); await p.waitForSelector('text=No reports yet.');
check('6 demo-only notice', (await p.innerText('body')).includes('Demo only. Do not upload real medical documents.'));
await p.setInputFiles('input[type=file]', [{ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }]);
check('6 wrong type refused', (await p.locator('text=Only PDF, JPG or PNG files are allowed.').count()) === 1);
await p.setInputFiles('input[type=file]', [{ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 10) }]);
check('6 too large refused', (await p.locator('text=This file is larger than 2 MB.').count()) === 1);
await p.setInputFiles('input[type=file]', [{ name: 'lab result.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') }]); await p.waitForSelector('text=lab result.pdf');
const row = await p.innerText('li'); check('6 listed as PDF and Will be shared', row.includes('PDF') && row.includes('Will be shared'));
const [tab] = await Promise.all([ctx.waitForEvent('page'), p.getByRole('button', { name: 'Open lab result.pdf' }).click()]);
await sleep(800); check('6 opens in a new tab', tab.url().startsWith('blob:'), tab.url().slice(0, 20)); await tab.close();
await p.goto(BASE + '/consent'); await toggle('Reports'); await p.goto(BASE + '/reports'); await p.waitForSelector('text=Not shared', { timeout: 5000 });
check('6 indicator follows consent', (await p.innerText('li')).includes('Not shared: Reports sharing is off'));
await p.getByRole('button', { name: 'Delete lab result.pdf' }).click(); await p.click("button:has-text('Yes, delete')"); await p.waitForSelector('text=No reports yet.');
check('6 layout ok', await clean()); await p.goto(BASE + '/consent'); await toggle('Reports');

await p.goto(BASE + '/'); await p.waitForSelector("section[aria-label='Digital twin'] >> text=Usual:"); await sleep(1500);
let tw = await p.locator("section[aria-label='Digital twin']").innerText();
check('7 four within usual range', (tw.match(/Within your usual range/g) || []).length === 4 && tw.includes('Not a diagnosis.'));
check('7 no forbidden words', !/normal|abnormal|risk|danger/i.test(tw));
const baseline = { heart_rate: { min: 40, max: 50 }, spo2: { min: 95, max: 100 }, bp_systolic: { min: 100, max: 130 }, bp_diastolic: { min: 65, max: 85 }, glucose: { min: 80, max: 100 }, updated_at: 'x' };
await p.route('**/baseline', (r) => r.fulfill({ json: baseline })); await p.reload(); await p.waitForSelector('text=Changed from your usual'); await sleep(1500);
tw = await p.locator("section[aria-label='Digital twin']").innerText();
check('7 two different, two within', (tw.match(/Changed from your usual/g) || []).length === 2 && (tw.match(/Within your usual/g) || []).length === 2);
await p.unroute('**/baseline'); await p.route('**/baseline', (r) => r.fulfill({ status: 500, body: '{}' })); await p.reload();
await p.waitForSelector('text=Could not load your usual ranges.'); check('7 error state with Retry', (await p.getByRole('button', { name: 'Retry' }).count()) === 1);
await p.unroute('**/baseline'); await p.getByRole('button', { name: 'Retry' }).click(); await p.waitForSelector('text=Usual:');

for (const c of await api('GET', '/patients/PT-2026-0417/contacts', tok)) await api('DELETE', '/patients/PT-2026-0417/contacts/' + c.id, tok);
await p.goto(BASE + '/demo'); await p.click('text=Run Heart scenario'); await p.waitForURL('**/emergency/EM-*'); await p.waitForSelector('text=You have no emergency contacts.');
check('9 no-contacts message with link', (await p.locator("a:has-text('Add some in Profile.')").getAttribute('href')) === '/contacts');
await p.goto(BASE + '/demo'); await p.click('text=Reset demo'); await p.waitForSelector('text=Demo reset');
const consents = await api('GET', '/patients/PT-2026-0417/consents', tok);
check('10 reset restores contacts, consents, reports, log', (await api('GET', '/patients/PT-2026-0417/contacts', tok)).length === 2 && Object.values(consents.consents).every(Boolean)
  && (await api('GET', '/patients/PT-2026-0417/reports', tok)).length === 0 && consents.changes.length === 0);
await browser.close(); finish('data');
