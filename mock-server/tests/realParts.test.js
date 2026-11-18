// Offline tests for the "real" parts: SQLite saving, phone alerts (fake network) and the live stream. No express, no internet, no phone.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('node:module');

const routes = [];
const fakeExpress = { Router: () => { const r = {}; for (const m of ['get', 'post', 'delete', 'patch', 'put', 'use']) r[m] = (p, ...h) => { if (typeof p === 'string') routes.push({ m, path: p, h }); }; return r; } };
const origLoad = Module._load;
Module._load = function (req, ...a) { return req === 'express' ? fakeExpress : origLoad.call(this, req, ...a); };
const store = require('../store');
const persist = require('../persist');
const notify = require('../notify');
const live = require('../live');
const otherApps = require('../otherApps');
Module._load = origLoad;

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ht-')), 'test.db');
const emergency = (over = {}) => ({ id: 'EM-TEST-1', patient_id: 'PT-2026-0417', type: 'HEART', state: 'SOS_SENT', status_events: [{ state: 'SOS_SENT', timestamp: new Date().toISOString() }], hospital: { id: 'H-1', name: 'Test Hospital' }, ...over });

test('saving: data written to the SQLite file comes back after a restart, and an open alert is closed honestly', () => {
  const file = tmp();
  assert.ok(persist.open(file), 'node:sqlite needs Node 22.5+');
  store.emergencies.clear();
  store.emergencies.set('EM-A', emergency({ id: 'EM-A' }));
  store.emergencies.set('EM-B', emergency({ id: 'EM-B', state: 'HANDOVER_DONE' }));
  store.consentChanges['PT-2026-0417'].push({ at: 'x', note: 'saved-marker' });
  store.reports['PT-2026-0417'].push({ id: 'R-9', name: 'x.pdf', data: Buffer.from('hello') });
  assert.ok(persist.save() > 0);
  assert.strictEqual(persist.save(), 0, 'nothing changed: nothing written');
  persist.close();

  store.emergencies.clear(); store.consentChanges['PT-2026-0417'].length = 0; store.reports['PT-2026-0417'].length = 0;
  persist.open(file);
  const info = persist.load();
  assert.strictEqual(info.emergencies, 2);
  assert.strictEqual(info.interrupted, 1);
  assert.strictEqual(store.emergencies.get('EM-A').state, 'CANCELLED');
  assert.strictEqual(store.emergencies.get('EM-A').interrupted_by_restart, true);
  assert.strictEqual(store.emergencies.get('EM-B').state, 'HANDOVER_DONE');
  assert.ok(store.consentChanges['PT-2026-0417'].some((c) => c.note === 'saved-marker'));
  assert.strictEqual(Buffer.isBuffer(store.reports['PT-2026-0417'][0].data), true);
  assert.strictEqual(store.reports['PT-2026-0417'][0].data.toString(), 'hello');
  persist.close();
});

test('saving: event log and notification log are append-only rows; wipe forgets everything', () => {
  persist.open(tmp());
  persist.logEvent({ type: 'emergency.sos_sent', emergency_id: 'EM-A', state: 'SOS_SENT', payload: {} });
  persist.logEvent({ type: 'vitals.update', payload: {} }); // not logged
  persist.logNotification('EM-A', 'ntfy', true, 'sent');
  const s = persist.summary();
  assert.strictEqual(s.events, 1);
  assert.strictEqual(s.notifications, 1);
  persist.wipe();
  assert.strictEqual(persist.summary().events, 0);
  persist.close();
});

test('saving: a passport link keeps working after a restart (token hash and expiry survive)', () => {
  const file = tmp(); persist.open(file);
  const p = { token: 'tok-abc', patient_id: 'PT-2026-0418', created_at: 'c1', expires_at: new Date(Date.now() + 1e7).toISOString(), revoked: false, log: [], scope: ['blood_group'] };
  store.passports['PT-2026-0418'] = p; store.passportTokens.set('hash1', p);
  persist.save(); persist.close();
  delete store.passports['PT-2026-0418']; store.passportTokens.clear();
  persist.open(file); persist.load();
  assert.strictEqual(store.passportTokens.get('hash1'), store.passports['PT-2026-0418'], 'one shared object, not two copies');
  assert.strictEqual(store.passports['PT-2026-0418'].expires_at, p.expires_at);
  persist.close();
});

// ---- phone alerts ----
const config = () => ({ public_url: 'http://192.168.1.5:4000', ntfy: { server: 'https://ntfy.sh', topic: 'healthtwin-demo-secret-1234' },
  telegram: { bot_token: 'BOT:TOKEN', chat_ids: ['111', '222'] }, twilio: { account_sid: 'ACxx', auth_token: 'tok', from: '+15550001', to: ['+911111111111', '+912222222222'] } });

test('phone alerts: SOS sends one labelled message per team phone on every channel, never the patient contacts', async () => {
  const calls = []; notify.setFetch(async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 200 }; });
  notify.init(config()); notify.reset();
  store.emergencies.set('EM-TEST-1', emergency());
  notify.onEvent({ type: 'emergency.sos_sent', emergency_id: 'EM-TEST-1', state: 'SOS_SENT' });
  notify.onEvent({ type: 'emergency.sos_sent', emergency_id: 'EM-TEST-1', state: 'SOS_SENT' }); // duplicate: ignored
  await new Promise((r) => setTimeout(r, 30));
  assert.strictEqual(calls.length, 1 + 2 + 2, 'ntfy 1, telegram 2, sms 2');
  const text = calls.map((c) => String(c.opts.body)).join('\n');
  assert.match(text, /HEALTHTWIN DEMO/);
  assert.match(text, /do NOT call 112/);
  assert.ok(calls.some((c) => /api\.twilio\.com/.test(c.url)));
  const patientPhones = (store.patients['PT-2026-0417'].contacts || []).map((c) => c.phone).filter(Boolean);
  for (const ph of patientPhones) assert.ok(!text.includes(ph), 'a fictional contact number was used');
  for (const c of calls) assert.ok(!/[^\x00-\xff]/.test(Object.values(c.opts.headers || {}).join('')), 'header values must be plain ASCII');
});

test('phone alerts: at most 2 recipients per channel, a short ntfy topic is refused, failure never throws', async () => {
  const c = config(); c.twilio.to = ['+1', '+2', '+3']; c.telegram.chat_ids = ['1', '2', '3'];
  process.env.NTFY_TOPIC = 'short'; process.env.TELEGRAM_CHAT_IDS = '1,2,3,4'; process.env.TWILIO_TO = '+1,+2,+3';
  notify.init(); // reads the environment
  delete process.env.NTFY_TOPIC; delete process.env.TELEGRAM_CHAT_IDS; delete process.env.TWILIO_TO;
  assert.strictEqual(notify.channels().ntfy, false);
  const calls = []; notify.setFetch(async (u) => { calls.push(u); throw new Error('offline'); });
  notify.init({ ...config(), twilio: { ...config().twilio, to: ['+1', '+2'] } }); notify.reset();
  const r = await notify.send({ title: 'T', text: 'x' });
  assert.ok(r.length >= 3 && r.every((x) => x.ok === false));
});

test('phone alerts: nothing is sent when no channel is set up, and the description never shows a secret', async () => {
  const calls = []; notify.setFetch(async (u) => { calls.push(u); return { ok: true, status: 200 }; });
  notify.init({ ntfy: { topic: '' }, telegram: { bot_token: '', chat_ids: [] }, twilio: { to: [] } }); notify.reset();
  notify.onEvent({ type: 'emergency.sos_sent', emergency_id: 'EM-TEST-1' });
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(calls.length, 0);
  notify.init(config());
  assert.ok(!/secret|BOT:TOKEN|\+91/.test(notify.describe()));
});

test('phone alerts: ack, dispatch, arrived and cancelled each get their own message; vitals and others get none', () => {
  notify.init(config()); store.emergencies.set('EM-TEST-1', emergency());
  for (const t of ['hospital.acknowledged', 'ambulance.dispatched', 'emergency.arrived', 'emergency.cancelled']) assert.ok(notify.messageFor({ type: t, emergency_id: 'EM-TEST-1' }), t);
  for (const t of ['vitals.update', 'ambulance.location', 'live.update']) assert.strictEqual(notify.messageFor({ type: t, emergency_id: 'EM-TEST-1' }), null, t);
  const m = notify.messageFor({ type: 'ambulance.dispatched', emergency_id: 'EM-TEST-1' });
  assert.match(m.text, /SIMULATED ambulance/);
});

// ---- live stream ----
const patient = { consents: { location: true, vitals: true } };

test('live: location and heart rate are accepted, a ping per second at most, and an event is produced', () => {
  live.reset();
  const e = emergency();
  const r = live.accept(e, patient, { lat: 23.03, lng: 72.58, accuracy: 12.4, heart_rate: 141 }, 1000);
  assert.strictEqual(r.code, 200);
  assert.deepStrictEqual(r.body.accepted, { location: true, heart_rate: true });
  assert.strictEqual(r.event.type, 'live.update');
  assert.strictEqual(r.event.payload.heart_rate, 141);
  assert.strictEqual(r.event.payload.hr_source, 'strap');
  assert.strictEqual(r.event.payload.label, 'Live from patient phone');
  assert.strictEqual(live.accept(e, patient, { lat: 23.03, lng: 72.58 }, 1300).body.skipped, 'too_fast');
  assert.strictEqual(live.accept(e, patient, { lat: 23.04, lng: 72.59 }, 2500).code, 200);
  assert.strictEqual(e.live_trail.length, 2);
});

test('live: without the consent nothing is stored or announced', () => {
  live.reset();
  const e = emergency();
  const r = live.accept(e, { consents: { location: false, vitals: false } }, { lat: 23, lng: 72, heart_rate: 100 }, 1000);
  assert.strictEqual(r.body.skipped, 'no_consent');
  assert.strictEqual(r.event, undefined);
  assert.strictEqual(e.live, undefined);
  const onlyHr = live.accept(emergency({ id: 'EM-2' }), { consents: { location: false, vitals: true } }, { lat: 23, lng: 72, heart_rate: 100 }, 1000);
  assert.deepStrictEqual(onlyHr.body.accepted, { location: false, heart_rate: true });
  assert.strictEqual(onlyHr.event.payload.lat, undefined);
});

test('live: bad numbers, closed alerts and stop sharing', () => {
  live.reset();
  assert.strictEqual(live.accept(emergency(), patient, { lat: 200, lng: 10 }).code, 400);
  assert.strictEqual(live.accept(emergency(), patient, { heart_rate: 900 }).code, 400);
  assert.strictEqual(live.accept(emergency(), patient, {}).code, 400);
  assert.strictEqual(live.accept(emergency({ state: 'CANCELLED' }), patient, { lat: 1, lng: 1 }).code, 409);
  assert.strictEqual(live.accept(emergency({ state: 'EMERGENCY_DETECTED' }), patient, { lat: 1, lng: 1 }).code, 409);
  const e = emergency(); live.accept(e, patient, { lat: 1, lng: 1 }, 5000);
  const s = live.stop(e);
  assert.strictEqual(e.live.sharing, false);
  assert.strictEqual(s.event.type, 'live.stopped');
});

const handler = (m, p) => routes.find((r) => r.m === m && r.path === p);
const res = () => { const o = { code: 200, body: null, status(c) { o.code = c; return o; }, json(b) { o.body = b; return o; } }; return o; };
function call(route, user, params, body) {
  const t = 'live-' + Math.random(); if (user) store.tokens.set(t, user);
  const out = res(); let i = 0; const rq = { params, body, headers: { authorization: 'Bearer ' + t }, user: undefined, socket: {} };
  const next = () => { const h = route.h[i++]; if (h) h(rq, out, next); }; next(); return out;
}
test('live: only the patient who owns the alert can stream into it', () => {
  live.reset();
  store.emergencies.set('EM-OWN', emergency({ id: 'EM-OWN' }));
  const route = handler('post', '/emergencies/:id/live');
  assert.ok(route);
  const owner = { role: 'PATIENT', email: 'o', patient_id: 'PT-2026-0417' };
  assert.strictEqual(call(route, owner, { id: 'EM-OWN' }, { lat: 23, lng: 72 }).code, 200);
  assert.strictEqual(call(route, { role: 'PATIENT', email: 'x', patient_id: 'PT-2026-0418' }, { id: 'EM-OWN' }, { lat: 23, lng: 72 }).code, 404);
  assert.strictEqual(call(route, { role: 'HOSPITAL_STAFF', email: 's' }, { id: 'EM-OWN' }, { lat: 23, lng: 72 }).code, 403);
});

test('live: another patient phone never receives this patient events', () => {
  store.emergencies.set('EM-OWN', emergency({ id: 'EM-OWN' }));
  const ev = { type: 'live.update', emergency_id: 'EM-OWN', payload: {} };
  assert.strictEqual(otherApps.filterFor({ role: 'PATIENT', patient_id: 'PT-2026-0417' }, ev), ev);
  assert.strictEqual(otherApps.filterFor({ role: 'PATIENT', patient_id: 'PT-2026-0418' }, ev), null);
  assert.strictEqual(otherApps.filterFor({ role: 'HOSPITAL_STAFF' }, ev), ev);
});
