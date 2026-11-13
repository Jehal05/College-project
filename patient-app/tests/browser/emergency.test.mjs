// Phase 2: symptom checklist, emergency screen, countdown, SOS, hospital response, consent and location, demo tools.
import { BANNER, BASE, api, check, finish, freshState, launch, login, newPage, noOverflow, phone, sleep, unnamedControls } from './helpers.mjs';

const tok = await freshState();
const INIT = `window.__beeps = 0; window.__vib = 0;
const AC = window.AudioContext || window.webkitAudioContext;
if (AC) { const o = AC.prototype.createOscillator; AC.prototype.createOscillator = function(){ window.__beeps++; return o.apply(this, arguments); }; }
navigator.vibrate = function(){ window.__vib++; return true; };`;
const browser = await launch();
const ctx = await phone(browser); await ctx.addInitScript(INIT);
const p = await newPage(ctx); await login(p); await p.waitForSelector('text=Hello, Rahul');
const helpBtn = () => p.getByRole('button', { name: 'Get help now' });
const pickHeart = async () => { await p.click('text=Heart or chest'); await p.getByLabel('Chest pain or pressure').check(); await p.getByLabel('Shortness of breath').check(); };
async function startHeart() {
  await p.click('text=Emergency help'); await p.waitForSelector('text=What is happening?'); await pickHeart();
  const t0 = Date.now(); await p.click('text=Get help now'); await p.waitForURL('**/emergency/E-*'); return (Date.now() - t0) / 1000;
}

check('2.1 Home has a red Emergency help link to /symptoms', (await p.locator("a:has-text('Emergency help')").getAttribute('href')) === '/symptoms');
await p.click('text=Emergency help'); await p.waitForSelector('text=What is happening?');
check('2.2 symptoms: tel:112 call link and banner', (await p.locator("a:has-text('Call 112 / 108')").first().getAttribute('href')) === 'tel:112' && (await p.innerText('body')).includes(BANNER));
check('2.3 Get help now is disabled until a symptom is ticked', await helpBtn().isDisabled());
await p.click('text=Heart or chest'); check('2.4 still disabled with no symptom', await helpBtn().isDisabled());
await p.getByLabel('Chest pain or pressure').check(); check('2.5 enabled after one symptom', await helpBtn().isEnabled());
await p.click('text=Stroke signs'); check('2.6 switching category clears ticks', await helpBtn().isDisabled());
check('2.7 no overflow, all controls named', (await noOverflow(p)) && (await unnamedControls(p)).length === 0);

await pickHeart(); let t0 = Date.now(); await p.click('text=Get help now'); await p.waitForURL('**/emergency/E-*');
const dt = (Date.now() - t0) / 1000; await p.waitForSelector("text=I'm OK, cancel");
check('3.1 emergency screen opens in under a second', dt < 1, dt);
check('3.2 banner visible and bottom nav hidden', (await p.innerText('body')).includes(BANNER) && (await p.locator("nav[aria-label='Main navigation']").count()) === 0);
const box = await p.locator("a:has-text('Call 112 / 108')").boundingBox();
check('3.3 call link is on screen and at least 56 px tall', box && box.y >= 0 && box.y < 740 && box.height >= 56);
await sleep(2600); const [beeps, vib] = await p.evaluate('[window.__beeps, window.__vib]');
check('3.4 beep and vibration each second', beeps >= 2 && vib >= 2, [beeps, vib]);
await p.reload(); await p.waitForSelector("text=I'm OK, cancel");
const left = parseInt(await p.innerText('[role=timer]'), 10); check('3.5 countdown resumes after reload', left <= 8, left);
await p.click("text=I'm OK, cancel"); await p.waitForURL('**/cancelled'); check('3.6 cancelled screen', (await p.innerText('h1')).length > 0);
await p.click('text=Back to Home'); await p.waitForSelector('text=Hello, Rahul'); await sleep(800);
check('3.7 no active-emergency banner after cancel', (await p.locator('text=You have an active emergency').count()) === 0);

await startHeart(); await p.click('text=Send now'); await p.waitForSelector('text=Alert sent');
await p.waitForSelector('text=/Using demo location|Using your location/'); check('4.1 location label shown', true);
await p.waitForSelector('text=/Hospital: Demo Heart Care Hospital/', { timeout: 5000 });
await p.waitForSelector('text=Ambulance ETA', { timeout: 8000 });
check('4.2 false-alarm button visible mid-response', await p.getByRole('button', { name: 'False alarm? Cancel' }).isVisible());
await p.reload(); await p.waitForSelector('text=Alert sent'); check('4.3 reload mid-response restores state', (await p.locator('text=/Hospital: /').count()) > 0);
await p.goto(BASE + '/'); await p.waitForSelector('text=You have an active emergency', { timeout: 4000 }); check('4.4 Home banner while active', true);
await p.click('text=Return to it'); await p.waitForSelector('text=The simulated emergency has ended.', { timeout: 12000 });
const states = await p.locator("ol[aria-label='Timeline'] li p").allInnerTexts();
check('4.5 timeline reached Handover done', states.some((s) => s.includes('Handover done')), states);
await p.goto(BASE + '/'); await p.waitForSelector('text=Hello, Rahul'); await sleep(800);
check('4.6 banner cleared after handover', (await p.locator('text=You have an active emergency').count()) === 0);

await startHeart(); await p.waitForSelector('text=Alert sent', { timeout: 14000 }); check('5 natural countdown sends the SOS', true);
await p.waitForSelector('text=The simulated emergency has ended.', { timeout: 12000 });

await api('PATCH', '/patients/HT-1001', tok, { consents: { location: false, history: true, vitals: true, reports: true } });
await p.goto(BASE + '/symptoms'); await p.click('text=Stroke signs'); await p.getByLabel('Face drooping').check(); await p.click('text=Get help now');
await p.waitForURL('**/emergency/E-*'); await p.click('text=Send now'); await p.waitForSelector('text=Alert sent');
check('6 consent off: location sharing is off', (await p.locator('text=Location sharing is off in your consent settings').count()) === 1);
await api('PATCH', '/patients/HT-1001', tok, { consents: { location: true, history: true, vitals: true, reports: true } });

const ctx2 = await phone(browser, { geolocation: { latitude: 21.2, longitude: 72.85 }, permissions: ['geolocation'] }); await ctx2.addInitScript(INIT);
const q = await newPage(ctx2); await login(q);
await q.click('text=Emergency help'); await q.click('text=Heart or chest'); await q.getByLabel('Chest pain or pressure').check(); await q.click('text=Get help now');
await q.waitForURL('**/emergency/E-*'); await q.click('text=Send now'); await q.waitForSelector('text=Alert sent');
await q.waitForSelector('text=Using your location'); check('7.1 real location used when allowed', true);
await q.goto(BASE + '/symptoms'); await q.getByLabel('Use demo location').check(); await q.click('text=Heart or chest'); await q.getByLabel('Chest pain or pressure').check();
await q.click('text=Get help now'); await q.waitForURL('**/emergency/E-*'); await q.click('text=Send now'); await q.waitForSelector('text=Alert sent');
await q.waitForSelector('text=Using demo location'); check('7.2 demo location can be forced', true);

await p.goto(BASE + '/demo'); await p.click('text=Run Stroke scenario'); await p.waitForURL('**/emergency/E-*');
await p.waitForSelector('text=/Hospital: Demo City Stroke/', { timeout: 6000 }); check('8.1 stroke scenario picks the stroke centre', true);
await p.goto(BASE + '/demo'); await p.click('text=Reset demo'); await p.waitForSelector('text=Demo reset');
await p.goto(BASE + '/emergency/E-0001'); await p.waitForSelector('text=Could not load this emergency.');
check('8.2 unknown emergency shows an error and still has the call link', (await p.locator("a:has-text('Call 112 / 108')").count()) === 1);
await p.goto(BASE + '/demo'); await p.click('text=Run Asthma scenario'); await p.waitForURL('**/emergency/E-*');
await p.waitForSelector('text=/Hospital: Demo Heart Care Hospital/', { timeout: 6000 }); check('8.3 asthma falls back to the nearest emergency hospital', true);
check('9 condition-specific text stays hidden until reviewed', (await p.locator('text=Guidance for this condition will appear here after medical review.').count()) === 1);
await browser.close(); finish('emergency');
