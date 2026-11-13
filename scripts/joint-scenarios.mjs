// Scenarios a-g of the joint rehearsal (see scripts/joint-rehearsal.mjs). Selectors used are named in each check.
import { sleep } from './joint-util.mjs';
import { makeKit } from './joint-util.mjs';

export async function runScenarios(env) {
  const k = await makeKit(env); const { check, desk, phone, api, tok, card, patientStart, cancelInPatient } = k;
  const quiet = (ms) => sleep(ms);

  // a) SOS from the symptoms path -> card with type, severity, patient id, readable symptoms, vitals (consent on)
  const a = await patientStart('/symptoms'); const c = card(a.id);
  await c.waitFor({ timeout: 15000 }).catch(() => {});
  const txt = (await c.innerText().catch(() => '')) || '';
  check('a1 card appears: [data-testid=alert-card][data-id=' + a.id + ']', txt.length > 0);
  check('a2 card shows type, severity, patient id, readable symptoms', /heart/i.test(txt) && /EMERGENCY/.test(txt) && txt.includes('PT-2026-0417') && /Chest pain/.test(txt), txt.replace(/\n/g, ' | '));
  check('a3 vitals shown when consent is on (HR / SpO2 / BP not dashes)', /HR \d+/.test(txt) && /SpO₂ \d+/.test(txt) && /BP \d+\/\d+/.test(txt), txt.replace(/\n/g, ' | '));
  check('a4 portal shows the patient location (lat, lng)', /\d+\.\d{4}, \d+\.\d{4}/.test(txt));
  await quiet(1800); await k.shot('portal-dashboard-alert', desk); await k.shot('patient-timeline-after-sos', a.page);

  // b) desk acknowledges, dispatches; the patient follows
  await c.click();
  await desk.locator('button[data-action=HOSPITAL_ACKNOWLEDGED]').click();
  const inTimeline = (p, text) => p.waitForSelector("ol[aria-label='Timeline'] li:has-text('" + text + "')", { timeout: 15000 }).then(() => true).catch(() => false);
  const ack = await inTimeline(a.page, 'Hospital acknowledged');
  check('b1 desk Acknowledge -> patient timeline (ol[aria-label=Timeline] li) shows "Hospital acknowledged"', ack);
  const steps = (await a.page.locator("ol[aria-label='Timeline'] li").allInnerTexts()).join(' | ');
  check("b2 before dispatch the patient timeline (ol[aria-label=Timeline] li) has no 'Ambulance dispatched' yet", /Hospital acknowledged/.test(steps) && !/Ambulance dispatched/.test(steps), steps);
  await desk.locator('button[data-action=AMBULANCE_DISPATCHED]').click(); await desk.locator('[data-testid=confirm-dispatch]').click();
  check('b3 desk Dispatch -> patient timeline shows "Ambulance dispatched"', await inTimeline(a.page, 'Ambulance dispatched'));
  check('b4 patient sees an ambulance ETA while the portal moves the unit', await a.page.waitForSelector('text=Ambulance ETA', { timeout: 20000 }).then(() => true).catch(() => false));
  for (const s of ['EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE']) {
    const btn = desk.locator('button[data-action=' + s + ']'); await btn.waitFor({ timeout: 8000 }).catch(() => {});
    if (await btn.isEnabled().catch(() => false)) await btn.click(); await quiet(700);
  }
  check('b5 Arrived + Handed over -> patient sees the end screen', await a.page.waitForSelector('text=The simulated emergency has ended.', { timeout: 20000 }).then(() => true).catch(() => false));
  check('b6 card state is HANDOVER_DONE in the portal', (await c.getAttribute('data-state').catch(() => '')) === 'HANDOVER_DONE');

  // c) cancel INSIDE the countdown -> no card, ever
  const cc = await patientStart('/symptoms', { send: false });
  await quiet(3000); await cancelInPatient(cc.page, 'countdown'); await quiet(4000);
  check('c1 cancel inside the countdown: portal never shows a card for ' + cc.id, (await card(cc.id).count()) === 0);

  // d) cancel AFTER SOS -> card CANCELLED and buttons disabled
  const d = await patientStart('/symptoms'); await card(d.id).waitFor({ timeout: 15000 });
  await cancelInPatient(d.page, 'after-sos');
  await desk.waitForSelector('[data-testid=alert-card][data-id=' + d.id + '][data-state=CANCELLED]', { timeout: 15000 }).catch(() => {});
  check('d1 card data-state=CANCELLED', (await card(d.id).getAttribute('data-state')) === 'CANCELLED');
  await card(d.id).click(); await quiet(500);
  const dis = await desk.locator('button[data-action]').evaluateAll((bs) => bs.map((b) => b.disabled));
  check('d2 every action button [data-action] is disabled', dis.length > 0 && dis.every(Boolean), dis);
  await k.shot('portal-cancelled-card', desk);

  // e) consent off: vitals, then location
  await api('PUT', '/patients/PT-2026-0417/consents', tok(), { vitals: false });
  const e1 = await k.apiAlert(); await card(e1).waitFor({ timeout: 15000 }); const t1 = await card(e1).innerText();
  check('e1 vitals consent off -> card shows no vitals (HR – / SpO₂ –%)', /HR –/.test(t1) && /SpO₂ –/.test(t1), t1.replace(/\n/g, ' | '));
  await api('PUT', '/patients/PT-2026-0417/consents', tok(), { vitals: true, location: false });
  const e2 = await k.apiAlert(); await card(e2).waitFor({ timeout: 15000 }); const t2 = await card(e2).innerText();
  check('e2 location consent off -> card has no coordinates', !/\d+\.\d{4}, \d+\.\d{4}/.test(t2) && /HR \d+/.test(t2), t2.replace(/\n/g, ' | '));
  await api('PUT', '/patients/PT-2026-0417/consents', tok(), { location: true });

  // f) safety check-in, no answer -> a card; record how type UNKNOWN is shown
  const f = await k.checkIn();
  const ft = f ? await card(f).innerText().catch(() => '') : '';
  check('f1 check-in alert (Simulated fall, no answer) shows a card', ft.length > 0);
  console.log('NOTE f2 how the portal renders type UNKNOWN: ' + JSON.stringify(ft.replace(/\n/g, ' | ')));
  k.note('f2 UNKNOWN card text: ' + ft.replace(/\n/g, ' | '));

  // g) console errors in both apps
  const bad = k.logs.filter((l) => !/401|404|409|Failed to load resource/.test(l));
  check('g1 no unexpected console errors in either app', bad.length === 0, bad.slice(0, 4));
  await k.done();
  return k.results;
}
