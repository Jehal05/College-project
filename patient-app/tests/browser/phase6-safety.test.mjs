// Phase 6: safety check-in (I'm OK, no answer, Cancel), simulated offline + SMS card, demo panel hidden in a normal build.
import { BASE, api, check, finish, freshState, launch, login, newPage, phone, sleep } from './helpers.mjs';

const tok = await freshState();
const browser = await launch(); const ctx = await phone(browser, { viewport: { width: 390, height: 900 } });
const p = await newPage(ctx); await login(p);

// Off by default
await p.goto(BASE + '/profile'); await p.waitForSelector('text=Safety check-in');
const prefs0 = await api('GET', '/patients/PT-2026-0417/preferences', tok);
check('C1 safety check-in is OFF by default', prefs0.safety_checkin && prefs0.safety_checkin.enabled === false, prefs0);
check('C2 Profile says what the app cannot do (honest limits)', /cannot|can not|only/i.test(await p.innerText('main')));

// Simulated fall -> I'm OK
await p.goto(BASE + '/demo'); await p.waitForSelector("[data-testid='demo-status']");
await p.getByRole('button', { name: 'Simulated fall' }).click(); await p.waitForSelector("text=Are you OK?");
check('C3 check-in is full screen with I\'m OK and tel:112', (await p.getByRole('button', { name: "I'm OK" }).isVisible()) && (await p.locator('a[href="tel:112"]').count()) >= 1);
const box = await p.getByRole('button', { name: "I'm OK" }).boundingBox(); check('C4 I\'m OK is huge (>= 44 px high)', box.height >= 44, box);
check('C5 countdown text starts at 30 or below', /Alert starts in (30|29|28) seconds/.test(await p.innerText('body')));
await p.getByRole('button', { name: "I'm OK" }).click(); await p.waitForSelector('text=Are you OK?', { state: 'detached' });
check('C6 I\'m OK closes it and starts no emergency', (await api('GET', '/patients/PT-2026-0417/emergencies', tok)).length === 0);

// Simulated fall -> no answer
await p.getByRole('button', { name: 'Simulated fall' }).click(); await p.waitForSelector('text=Are you OK?');
await p.waitForURL(/\/emergency\//, { timeout: 45000 });
const list = await api('GET', '/patients/PT-2026-0417/emergencies', tok);
check('C7 no answer starts an emergency with source FALL_CHECK', list.length === 1 && list[0].source === 'FALL_CHECK', list);
await p.waitForSelector('text=Why this alert');
check('C8 Emergency screen says it started from the check-in (simulated)', /safety check-in/i.test(await p.innerText('main')));
await p.getByRole('button', { name: 'False alarm? Cancel' }).click();
await p.getByRole('button', { name: /yes|cancel|confirm/i }).last().click().catch(() => {});
await p.waitForURL(/cancelled/, { timeout: 10000 }).catch(() => {});
check('C9 Cancel still works on a check-in alert', (await api('GET', '/patients/PT-2026-0417/emergencies', tok))[0].final_state === 'CANCELLED' || /cancelled/.test(p.url()), p.url());
check('C10 cancelled screen links to the record', (await p.locator('a[href^="/summary/"]').count()) >= 1);

// Validation of source
const badSrc = await fetch((process.env.TEST_API_URL || 'http://localhost:4000') + '/emergencies', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN'], source: 'BOGUS' }) });
check('C11 invalid source -> 400', badSrc.status === 400);

// Simulated offline -> SMS card
await api('POST', '/demo/reset', tok);
await p.goto(BASE + '/demo'); await p.waitForSelector("[data-testid='demo-status']");
await p.getByRole('switch', { name: /No data connection/ }).click();
const nav = (path) => p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')); }, path);
await nav('/symptoms'); await sleep(600); await p.click('text=Stroke signs'); await p.getByLabel('Face drooping').check(); await p.click('text=Get help now');
await p.waitForSelector("[data-testid='sms-text']", { timeout: 20000 }).catch(() => {});
const card = await p.innerText('main');
check('M1 SMS card shown with the honest wording', card.includes('No internet. Tell your contacts by SMS') && card.includes('You must press send yourself'));
check('M2 tel:112 comes before the SMS card', await p.evaluate(() => { const a = document.querySelector('main a[href="tel:112"]'); const s = document.querySelector("[data-testid='sms-text']"); return !!a && !!s && (a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0; }));
const hrefs = await p.locator('a[href^="sms:"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
check('M3 one sms: link per contact, primary first', hrefs.length === 2 && hrefs[0].includes('+910000000001'), hrefs);
const body = decodeURIComponent(hrefs.join(' ')); const shown = await p.innerText("[data-testid='sms-text']");
check('M4 message holds no health data', !/stroke|face|drooping|heart|spo2|bpm|Penicillin|Metformin|Hypertension|Rahul|B\+/i.test(body + shown), shown);
check('M5 exact text is shown and matches the link', hrefs.every((h) => decodeURIComponent(h).includes('I need help. This is a simulated alert from the HealthTwin demo.')) && shown.includes('I need help.'));
check('M6 Android form uses ?body=', hrefs.every((h) => /^sms:\+\d+\?body=/.test(h)));
check('M7 app never claims the SMS was sent', !/SMS (was )?sent|contacts (were|have been) told/i.test(card.replace(/The app cannot tell whether an SMS was sent\./, '')));
check('M8 no "alert sent" success wording while offline', !/Alert sent|Help is on the way/i.test(card.replace('Not sent yet', '')));
// iPhone variant
const ictx = await phone(browser, { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
const q = await newPage(ictx); await login(q); await sleep(1500);
await q.goto(BASE + '/demo'); await q.waitForSelector("[data-testid='demo-status']"); await q.getByRole('switch', { name: /No data connection/ }).click();
await q.evaluate(() => { history.pushState({}, '', '/symptoms'); dispatchEvent(new PopStateEvent('popstate')); }); await sleep(600);
await q.click('text=Stroke signs'); await q.getByLabel('Face drooping').check(); await q.click('text=Get help now'); await q.waitForSelector('a[href^="sms:"]', { timeout: 20000 });
const ih = await q.locator('a[href^="sms:"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
check('M9 iPhone form uses &body=', ih.length === 2 && ih.every((h) => /^sms:\+\d+&body=/.test(h)), ih);
// No location consent -> no map link; back online -> sent
await api('PUT', '/patients/PT-2026-0417/consents', tok, { location: false, history: true, vitals: true, reports: true });
// Switch off the simulated offline and let the pending alert send
await q.evaluate(() => { history.pushState({}, '', '/demo'); dispatchEvent(new PopStateEvent('popstate')); });
await q.getByRole('switch', { name: /No data connection/ }).click();
await q.evaluate(() => { history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')); });
await sleep(6000);
check('M10 after the connection returns the alert reaches the server', (await api('GET', '/patients/PT-2026-0417/emergencies', tok)).length >= 1);
await api('PUT', '/patients/PT-2026-0417/consents', tok, { location: true, history: true, vitals: true, reports: true });
// Storage dump after check-in, SMS fallback and demo use: nothing from the new features may sit in browser storage
for (const page of [p, q]) {
  const dump = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), indexedDB.databases ? 'idb' : '']));
  check('X1 no check-in, emergency, reasons, summary, reminder or preference data in browser storage', !/FALL_CHECK|INACTIVITY|matched_rules|\/reminders|\/emergencies|\/preferences|safety_checkin|Secret Pill|Demo medicine/.test(dump), dump.slice(0, 200));
  const idb = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : []));
  check('X2 the only IndexedDB is the service worker\'s own file-expiry list (no app data)', idb.every((n) => /^workbox-expiration/.test(n)), idb);
}
finish('phase6-safety');
