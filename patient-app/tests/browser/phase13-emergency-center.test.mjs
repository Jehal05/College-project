// Phase 13 (UI redesign): Emergency Response Center. SIMULATION badge, honest step list, sent vs acknowledged, no early "dispatched".
import { BASE, api, check, finish, freshState, launch, newPage, phone, sleep, noOverflow, token } from './helpers.mjs';

await freshState();
const browser = await launch();
const tok = await token();
const signIn = async (p) => {
  await p.goto(BASE + '/login');
  await p.fill('input[type=email]', 'patient@demo.test'); await p.fill('input[type=password]', 'demo1234'); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.includes('login'));
};

let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); let p = await newPage(ctx);
await signIn(p);
await p.goto(BASE + '/emergency-center');
await p.getByRole('heading', { name: 'Emergency Center', level: 1 }).waitFor({ timeout: 10000 });
let body = await p.innerText('body');
check('E1 shows the SIMULATION note and the always-there call button', body.includes('SIMULATION') && (await p.locator('a[href="tel:112"]').count()) >= 1);
check('E2 with nothing running it says so and offers to report symptoms', body.includes('No emergency is running') && (await p.getByRole('link', { name: 'Report symptoms' }).count()) === 1);
await p.getByText('Live vitals').waitFor({ timeout: 10000 }).catch(() => {}); await p.getByText('Your emergency contacts').waitFor();
body = await p.innerText('body');
check('E3 sharing shows the four consent switches and contacts are listed', ['Location', 'Medical history', 'Live vitals', 'Reports'].every((n) => body.includes(n)) && body.includes('Your emergency contacts'));
check('E4 no horizontal scrolling (desktop)', await noOverflow(p));

// start an emergency and send the SOS, then watch the steps
const made = await api('POST', '/emergencies', tok, { patient_id: 'PT-2026-0417', type: 'HEART', symptoms: ['CHEST_PAIN'] });
await api('POST', '/emergencies/' + made.id + '/sos', tok, { location: { lat: 23.0225, lng: 72.5714 } });
await p.reload();
await p.getByText('Alert sent (simulated)').first().waitFor({ timeout: 10000 });
body = await p.innerText('body');
check('E5 the steps list shows the SOS as done with a time and the sent/ack lines are separate', /Alert sent \(simulated\)\s*\d/.test(body.replace(/\n/g, ' ')) && body.includes('Hospital notification: sent') && /Hospital acknowledgement: (received|not received yet)/.test(body));
check('E6 contact acknowledgement is stated as not tracked', body.includes('not tracked in this prototype'));
let sawDispatchedTooEarly = false;
for (let i = 0; i < 40; i++) {
  const txt = (await p.innerText('body')).replace(/\n/g, ' ');
  const server = await api('GET', '/emergencies/' + made.id, tok);
  const events = (server.status_events || server.timeline || []).map((e) => e.state);
  if (/Ambulance dispatched \(simulated\)\s*\d/.test(txt) && !events.includes('AMBULANCE_DISPATCHED')) sawDispatchedTooEarly = true;
  if (events.includes('HANDOVER_DONE')) break;
  await sleep(1000);
}
check('E7 "Ambulance dispatched" never appeared before that event existed', !sawDispatchedTooEarly);
await p.reload(); await p.getByText('Handover done').first().waitFor({ timeout: 15000 }).catch(() => {});
check('E8 a finished alert appears in recent alerts or the step list with its final state', (await p.innerText('body')).includes('Handover done'));
await ctx.close();

ctx = await phone(browser); p = await newPage(ctx);
await signIn(p); await p.goto(BASE + '/emergency-center');
await p.getByRole('heading', { name: 'Emergency Center', level: 1 }).waitFor({ timeout: 10000 });
check('P1 phone layout fits 360 px', await noOverflow(p));
await ctx.close();

ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); p = await newPage(ctx);
await signIn(p); await p.evaluate(`localStorage.setItem('ht.lang','gu')`);
await p.goto(BASE + '/emergency-center'); await p.waitForSelector('h1', { timeout: 10000 });
body = await p.innerText('body');
check('G1 Gujarati page has translated text and no raw keys', body.includes('સિમ્યુલેશન') && !/\bemc\.[a-zA-Z.]+/.test(body));
await ctx.close();
await browser.close();
finish();
