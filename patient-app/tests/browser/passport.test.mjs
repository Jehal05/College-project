// Phase 5: QR health passport (create, scan, consent, revoke, expiry, log, responder page), notifications bell, browser alerts.
import { createRequire } from 'node:module';
import { BASE, API, api, check, finish, freshState, launch, login, newPage, phone, sleep, noOverflow } from './helpers.mjs';

const require = createRequire(import.meta.url);
const jsQR = require('jsqr'); const { PNG } = (() => { try { return require('pngjs'); } catch { return {}; } })();
const tok = await freshState();
const browser = await launch(); const ctx = await phone(browser, { viewport: { width: 390, height: 900 } });
await ctx.addInitScript(`window.__notes = []; window.Notification = class { static permission = 'granted'; static requestPermission(){ return Promise.resolve('granted'); } constructor(t, o){ window.__notes.push([t, o && o.body]); } };`);
const p = await newPage(ctx); await login(p);
const FORBIDDEN = /diagnos|risk|normal|abnormal/i;

await p.goto(BASE + '/passport'); await p.waitForSelector("h1:has-text('Health passport')");
check('P1 /passport offers 1 hour, 24 hours (default) and 7 days', (await p.getByLabel('24 hours').isChecked()) && (await p.getByLabel('1 hour').count()) === 1 && (await p.getByLabel('7 days').count()) === 1);
await p.getByRole('button', { name: 'Create passport' }).click(); await p.waitForSelector('img[alt*="QR code"]');
const link = await p.evaluate(async () => { const r = await fetch('/'); return location.origin; });
const png = await p.locator('img[alt*="QR code"]').evaluate((img) => img.src);
check('P2 the QR image is a PNG data URL', png.startsWith('data:image/png;base64,'));
// Decode the QR with an independent decoder (jsQR): it must hold only the link with a random token.
const decoded = await p.evaluate(async ([src]) => {
  const img = new Image(); img.src = src; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height); return { w: d.width, h: d.height, data: Array.from(d.data) };
}, [png]);
const qr = jsQR(Uint8ClampedArray.from(decoded.data), decoded.w, decoded.h);
check('P3 the QR can be decoded', Boolean(qr));
const target = qr ? qr.data : '';
check('P4 QR contains ONLY a link with a random token (no personal or health data)', new RegExp('^' + link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/p/[A-Za-z0-9_-]{22,}$').test(target) && !/Rahul|Mehta|Penicillin|B\+|Metformin/i.test(target), target);
const token = target.split('/p/')[1];
check('P5 valid-for text and "Not opened yet"', (await p.innerText('body')).includes('Valid for 24 hours') && (await p.innerText('body')).includes('Not opened yet'));
check('P6 download, print and revoke controls', (await p.getByRole('link', { name: 'Download QR (PNG)' }).getAttribute('download')) === 'healthtwin-passport.png' && (await p.getByRole('button', { name: 'Print' }).count()) === 1 && (await p.getByRole('button', { name: 'Revoke now' }).count()) === 1);

// Responder: a fresh context with no login
const rctx = await phone(browser); const r = await newPage(rctx);
await r.goto(target); await r.waitForSelector("[data-testid='passport-content']");
const content = await r.innerText("[data-testid='passport-content']"); const top = await r.innerText('main');
check('P7 responder page needs no login and shows the shared details', ['Rahul Mehta', 'B+', 'Penicillin', 'Hypertension', 'Metformin', 'Sunita Mehta', 'Karan Mehta', 'Prepared by the patient. Not verified by a doctor.'].every((s) => content.includes(s)));
check('P8 responder page starts with Call 112 / 108 (tel:112)', (await r.locator("main a").first().getAttribute('href')) === 'tel:112' && top.trimStart().startsWith('Call 112 / 108'));
check('P9 phone numbers are tel: links', (await r.locator("[data-testid='passport-content'] a[href^='tel:']").count()) === 2);
check('P10 responder content has none of the forbidden words', !FORBIDDEN.test(content), content.match(FORBIDDEN));
check('P11 responder page: no overflow, robots noindex, no-referrer', (await noOverflow(r)) && (await r.evaluate("!!document.querySelector('meta[name=robots][content=noindex]') && document.querySelector('meta[name=referrer]').content === 'no-referrer'")));
const sentAuth = []; r.on('request', (q) => { if (q.url().includes('/passport/')) sentAuth.push(q.headers().authorization); });
await r.reload(); await r.waitForSelector("[data-testid='passport-content']"); check('P12 the responder call sends no login token', sentAuth.length > 0 && sentAuth.every((h) => !h));

// Consent applies live
await api('PUT', '/patients/PT-2026-0417/consents', tok, { location: true, history: false, vitals: true, reports: true });
await r.reload(); await r.waitForSelector("[data-testid='passport-content']");
const limited = await r.innerText("[data-testid='passport-content']");
check('P13 history consent off removes allergies, conditions, medicines and contacts', limited.includes('Rahul Mehta') && !limited.includes('Penicillin') && !limited.includes('Metformin') && !limited.includes('Sunita Mehta') && limited.includes('The patient has not shared this section.'));
const raw = await (await fetch(API + '/passport/' + token)).json();
check('P14 the server response itself omits the data', !('allergies' in raw) && !('contacts' in raw) && raw.shared.history === false);
await api('PUT', '/patients/PT-2026-0417/consents', tok, { location: true, history: true, vitals: true, reports: true });

// Log: matches real opens, no IP/device
await p.goto(BASE + '/passport'); await p.waitForSelector('text=/Opened \\d+ times?/'); await sleep(300);
const log = await api('GET', '/patients/PT-2026-0417/passport/log', tok);
const shownCount = parseInt(((await p.innerText('body')).match(/Opened (\d+) time/) || [])[1], 10);
check('P15 "Opened N times" equals the server log', shownCount === log.length && log.length >= 4, [shownCount, log.length]);
check('P16 the log holds only times (no IP or device data)', log.every((e) => Object.keys(e).join() === 'opened_at'));

// Notifications bell + browser alerts
await p.goto(BASE + '/'); await sleep(1500);
await (await fetch(API + '/passport/' + token)).text(); await sleep(1500);
await p.getByRole('button', { name: /Notifications/ }).click(); const panel = await p.innerText('#notif-panel');
check('N1 bell lists "Passport opened"', panel.includes('Passport opened'));
check('N2 browser alerts are OFF by default', (await p.getByRole('switch', { name: 'Browser alerts' }).getAttribute('aria-checked')) === 'false');
await api('POST', '/demo/scenario', tok, { type: 'STROKE' }); await sleep(2500);
const panel2 = await p.innerText('#notif-panel').catch(() => '');
check('N3 bell lists contacts notified, hospital acknowledged and ambulance dispatched', ['Your contacts were notified (simulated)', 'Hospital acknowledged', 'Ambulance dispatched'].every((s) => panel2.includes(s)), panel2.replace(/\n/g, ' | '));
check('N4 notifications carry no medical detail', !/stroke|chest|face|heart|symptom/i.test(panel2));
check('N5 no browser pop-up while alerts are off', (await p.evaluate('window.__notes.length')) === 0);
await p.getByRole('switch', { name: 'Browser alerts' }).click(); await sleep(300);
await p.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })");
await api('POST', '/demo/scenario', tok, { type: 'ASTHMA' }); await sleep(3500);
const notes = await p.evaluate('window.__notes');
check('N6 with alerts ON and the tab hidden, hospital/ambulance changes pop up', notes.length >= 1, notes);
check('N7 pop-up text has no medical detail', notes.every(([t, b]) => !/asthma|stroke|chest|heart|symptom|wheez/i.test(t + ' ' + b)));
await p.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })");

// Revoke and expiry
await p.goto(BASE + '/passport'); await p.waitForSelector('img[alt*="QR code"]'); await p.getByRole('button', { name: 'Revoke now' }).click();
await p.getByRole('button', { name: 'Yes, revoke it' }).click(); await p.waitForSelector("button:has-text('Create passport')");
const gone = await fetch(API + '/passport/' + token); check('P17 revoked link answers 410', gone.status === 410);
await r.reload(); await r.waitForSelector('text=This passport is no longer available.');
check('P18 responder sees the plain message and still has the call link', (await r.locator("a[href='tel:112']").count()) === 1 && !FORBIDDEN.test(await r.innerText('main')));
await p.getByLabel('1 hour').check(); await p.getByRole('button', { name: 'Create passport' }).click(); await p.waitForSelector('text=Valid for 1 hour');
const t2 = (await api('GET', '/patients/PT-2026-0417/passport', tok)).token; await api('POST', '/demo/passport/expire', tok);
check('P19 expired link answers 410', (await fetch(API + '/passport/' + t2)).status === 410);
check('P20 unknown token answers 410', (await fetch(API + '/passport/not-a-real-token-123456')).status === 410);
await p.getByRole('button', { name: /Revoke now/ }).click().catch(() => {});
await browser.close(); finish('passport');
