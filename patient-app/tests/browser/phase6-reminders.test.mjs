// Phase 6: medicine reminders (CRUD, limits, due banner with a fake clock, taken, snooze, hidden-tab notification), storage dump, a11y basics.
import { BASE, api, check, finish, freshState, launch, login, newPage, phone, sleep, noOverflow, unnamedControls } from './helpers.mjs';

const tok = await freshState();
const browser = await launch(); const ctx = await phone(browser, { viewport: { width: 360, height: 740 } });
await ctx.addInitScript(`window.__notes = []; window.Notification = class { static permission = 'granted'; static requestPermission(){ return Promise.resolve('granted'); } constructor(t, o){ window.__notes.push([t, o && o.body]); } };`);
const p = await newPage(ctx);
const at = new Date(); at.setHours(7, 59, 40, 0);
await p.clock.install({ time: at });
await login(p);
await p.goto(BASE + '/reminders'); await p.waitForSelector('text=Demo medicine A');
const body0 = await p.innerText('main');
check('R1 seeded reminders listed', body0.includes('Demo medicine A') && body0.includes('Demo medicine B'));
check('R2 says reminders only work while the app is open + ask your doctor wording', body0.includes('Reminders only work while this app is open') && body0.includes('Ask your doctor or pharmacist what to do.'));
check('R3 no medical advice words', !/double|take two|skip the dose|safe dose|you should take/i.test(body0));

// Create + validation
await p.getByRole('button', { name: 'Add a reminder' }).click();
await p.getByRole('button', { name: 'Save' }).click();
check('R4 empty name -> plain message', await p.getByText('Enter the medicine name.').isVisible());
await p.getByLabel('Medicine name').fill('Demo medicine C'); await p.getByLabel('Dose note (as written by your doctor)').fill('as written by your doctor');
await p.getByRole('button', { name: 'Save' }).click(); await p.waitForSelector('text=Demo medicine C');
let list = await api('GET', '/patients/HT-1001/reminders', tok); check('R5 created on the server (not in the browser)', list.length === 3);
const keys = await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
check('R6 browser storage holds no medicine data', keys.every((k) => !/remind|medic/i.test(k)) && !(await p.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).includes('Demo medicine'), keys);
// Max 8
for (let i = list.length; i < 8; i++) await api('POST', '/patients/HT-1001/reminders', tok, { name: 'Fill ' + i, dose_note: '', times: ['10:00'], days: [0, 1, 2, 3, 4, 5, 6] });
const over = await fetch((process.env.TEST_API_URL || 'http://localhost:4000') + '/patients/HT-1001/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ name: 'Nine', dose_note: '', times: ['10:00'], days: [1] }) });
check('R7 ninth reminder is refused (409)', over.status === 409);
await p.reload(); await p.waitForSelector('text=Demo medicine A');
check('R8 UI says the maximum is reached', /at most 8/.test(await p.innerText('main')));
// Pause / delete (in-page confirm)
const fills = (await api('GET', '/patients/HT-1001/reminders', tok)).filter((r) => r.name.startsWith('Fill'));
for (const r of fills) await api('DELETE', '/patients/HT-1001/reminders/' + r.id, tok);
await p.reload(); await p.waitForSelector('text=Demo medicine C');
const itemC = p.locator('li', { hasText: 'Demo medicine C' });
await itemC.getByRole('button', { name: 'Pause' }).click(); await p.waitForSelector('li:has-text("Demo medicine C") >> text=Paused');
check('R9 pause works', (await api('GET', '/patients/HT-1001/reminders', tok)).find((r) => r.name === 'Demo medicine C').paused === true);
await itemC.getByRole('button', { name: 'Delete' }).click();
check('R10 delete asks first (in-page confirm)', await p.getByText('Delete the reminder for Demo medicine C?').isVisible());
await p.getByRole('button', { name: 'Delete' }).last().click(); await p.waitForSelector('text=Demo medicine C', { state: 'detached' });
check('R11 deleted', (await api('GET', '/patients/HT-1001/reminders', tok)).length === 2);

// Due banner with fake clock (08:00 for medicine A)
await p.goto(BASE + '/'); await p.waitForSelector('text=Medicine reminders'); await sleep(800);
check('R12 no banner before 08:00', (await p.getByText('Time for: Demo medicine A').count()) === 0);
await p.clock.fastForward(40000); await sleep(800);
await p.waitForSelector('text=Time for: Demo medicine A', { timeout: 8000 });
check('R13 banner appears at 08:00 with Taken and snooze', (await p.getByRole('button', { name: 'Taken' }).isVisible()) && (await p.getByRole('button', { name: 'Remind me in 10 minutes' }).isVisible()));
await p.getByRole('button', { name: 'Remind me in 10 minutes' }).click();
check('R14 snooze hides the banner', (await p.getByText('Time for: Demo medicine A').count()) === 0);
await p.clock.fastForward(11 * 60 * 1000); await sleep(800);
await p.waitForSelector('text=Time for: Demo medicine A', { timeout: 8000 });
check('R15 banner returns after 10 minutes', true);
await p.getByRole('button', { name: 'Taken' }).click(); await sleep(800);
const log = await api('GET', '/patients/HT-1001/reminders/log', tok);
check('R16 Taken is recorded on the server', log.some((e) => e.taken_at), log);
check('R17 banner gone after Taken', (await p.getByText('Time for: Demo medicine A').count()) === 0);

// Hidden tab -> notification without the medicine name
const nowMs = await p.evaluate(() => Date.now()); const due = new Date(nowMs + 2 * 60000);
await api('POST', '/patients/HT-1001/reminders', tok, { name: 'Secret Pill', dose_note: '', times: [String(due.getHours()).padStart(2, '0') + ':' + String(due.getMinutes()).padStart(2, '0')], days: [0, 1, 2, 3, 4, 5, 6] });
await p.evaluate(() => { sessionStorage.setItem('ht.browserAlerts', '1'); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); window.dispatchEvent(new Event('ht:reminders-changed')); });
await sleep(800); await p.clock.fastForward(2.5 * 60 * 1000); await sleep(1000);
const notes = await p.evaluate(() => window.__notes);
check('R18 a hidden tab gets a notification', notes.length >= 1, notes);
check('R19 the notification never contains a medicine name', notes.every(([t, b]) => /Reminder from HealthTwin/.test(t) && !/Secret|Demo medicine/i.test(t + ' ' + (b || ''))), notes);

// Basics: layout, names, touch targets
await p.goto(BASE + '/reminders'); await p.waitForSelector('text=Demo medicine A');
check('R20 no overflow and every control has a name', (await noOverflow(p)) && (await unnamedControls(p)).length === 0, await unnamedControls(p));
const small = await p.evaluate(() => [...document.querySelectorAll('main button, main a, main input, main select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44; }).map((e) => e.outerHTML.slice(0, 60)));
check('R21 touch targets are at least 44 px high', small.length === 0, small);
finish('phase6-reminders');
