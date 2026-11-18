// Review fixes: "local only" must not pass through a tunnel, and a patient reaches only its own alerts.
const test = require('node:test');
const assert = require('node:assert');
const guards = require('../guards');
const store = require('../store');

const req = (over = {}) => ({ socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:4000' }, ...over });

test('local only: plain localhost passes', () => {
  assert.strictEqual(guards.isLocal(req()), true);
  assert.strictEqual(guards.isLocal(req({ socket: { remoteAddress: '::1' }, headers: { host: '[::1]:4000' } })), true);
  assert.strictEqual(guards.isLocal(req({ headers: { host: '127.0.0.1:4000' } })), true);
});

test('local only: a tunnel (loopback address but forwarding headers or a public Host) is refused', () => {
  assert.strictEqual(guards.isLocal(req({ headers: { host: 'abc.trycloudflare.com' } })), false);
  assert.strictEqual(guards.isLocal(req({ headers: { host: 'localhost:4000', 'x-forwarded-for': '1.2.3.4' } })), false);
  assert.strictEqual(guards.isLocal(req({ headers: { host: 'localhost:4000', 'cf-connecting-ip': '1.2.3.4' } })), false);
  assert.strictEqual(guards.isLocal(req({ headers: { host: 'localhost:4000', forwarded: 'for=1.2.3.4' } })), false);
  assert.strictEqual(guards.isLocal(req({ headers: { host: 'localhost.evil.com' } })), false);
});

test('local only: another computer on the Wi-Fi is refused', () => {
  assert.strictEqual(guards.isLocal(req({ socket: { remoteAddress: '192.168.1.20' }, headers: { host: '192.168.1.5:4000' } })), false);
});

const run = (mw, rq) => { const out = { code: 'next', body: null, status(c) { out.code = c; return out; }, json(b) { out.body = b; return out; } }; mw(rq, out, () => {}); return out; };
const as = (user, over) => { const t = 'scope-' + Math.random(); store.tokens.set(t, user); return { headers: { authorization: 'Bearer ' + t }, path: '/', method: 'GET', body: {}, ...over }; };
const amit = { role: 'PATIENT', patient_id: 'PT-2026-0417' };

test('a patient cannot read, cancel or stream into another patient\'s alert, nor list all alerts', () => {
  store.emergencies.set('EM-X', { id: 'EM-X', patient_id: 'PT-2026-0418' });
  store.emergencies.set('EM-MINE', { id: 'EM-MINE', patient_id: 'PT-2026-0417' });
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/EM-X' })).code, 404);
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/EM-X/cancel', method: 'POST' })).code, 404);
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/EM-X/live', method: 'POST' })).code, 404);
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/' })).code, 403);
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/EM-MINE' })).code, 'next');
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/EM-MINE/sos', method: 'POST' })).code, 'next');
});

test('a patient can start an emergency only for themselves; staff are unchanged', () => {
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/', method: 'POST', body: { patient_id: 'PT-2026-0418' } })).code, 403);
  assert.strictEqual(run(guards.emergencyScope, as(amit, { path: '/', method: 'POST', body: { patient_id: 'PT-2026-0417' } })).code, 'next');
  const staff = { role: 'HOSPITAL_STAFF', email: 's' };
  assert.strictEqual(run(guards.emergencyScope, as(staff, { path: '/' })).code, 'next');
  assert.strictEqual(run(guards.emergencyScope, as(staff, { path: '/EM-X' })).code, 'next');
  assert.strictEqual(run(guards.emergencyScope, { headers: {}, path: '/', method: 'GET' }).code, 'next', 'no login: requireAuth answers 401 later');
});

test('a patient cannot move ambulances; reading is fine', () => {
  assert.strictEqual(run(guards.staffWrites, as(amit, { method: 'POST' })).code, 403);
  assert.strictEqual(run(guards.staffWrites, as(amit, { method: 'GET' })).code, 'next');
  assert.strictEqual(run(guards.staffWrites, as({ role: 'HOSPITAL_STAFF' }, { method: 'POST' })).code, 'next');
});
