// Runs without express installed: a tiny fake Router records the handlers, then they are called directly.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');

const routes = [];
const fakeExpress = { Router: () => {
  const r = {};
  for (const m of ['get', 'post', 'delete', 'patch', 'use']) r[m] = (path, ...h) => { if (typeof path === 'string') routes.push({ m, path, h }); };
  return r;
} };
const origLoad = Module._load;
Module._load = function (req, ...a) { return req === 'express' ? fakeExpress : origLoad.call(this, req, ...a); };
const passport = require('../passport');
const store = require('../store');
Module._load = origLoad;

const find = (m, path) => routes.find((r) => r.m === m && r.path === path);
const res = () => { const o = { code: 200, body: null, status(c) { o.code = c; return o; }, json(b) { o.body = b; return o; } }; return o; };
// requireAuth is the real one: each request carries a bearer token that maps to a user in store.tokens.
let n = 0;
const withUser = (req) => { const t = 'tok' + (n++); store.tokens.set(t, req.user); return { ...req, headers: { authorization: 'Bearer ' + t } }; };
// Run the handler chain; stops when a handler does not call next.
function run(route, req) {
  const out = res(); let i = 0;
  const rq = req.user ? withUser(req) : { ...req, headers: {} };
  const next = () => { const h = route.h[i++]; if (h) h(rq, out, next); };
  next(); return out;
}
const tokenFor = (pid) => { const o = run(find('post', '/patients/:id/passport'), { params: { id: pid }, body: {}, user: { role: 'PATIENT', email: 'x', patient_id: pid }, socket: {} }); return o.body.token; };
const open = (token) => run(find('get', '/passport/:token'), { params: { token }, socket: { remoteAddress: 'ip-' + Math.random() } });

test('another patient cannot create, read, revoke or list the log', () => {
  const stranger = { role: 'PATIENT', email: 'p', patient_id: 'PT-2026-0418' };
  for (const [m, path] of [['post', '/patients/:id/passport'], ['get', '/patients/:id/passport'], ['delete', '/patients/:id/passport'], ['get', '/patients/:id/passport/log']]) {
    const o = run(find(m, path), { params: { id: 'PT-2026-0417' }, body: {}, user: stranger, socket: {} });
    assert.strictEqual(o.code, 403, m + ' ' + path);
  }
});

test('staff cannot manage a patient passport', () => {
  const o = run(find('post', '/patients/:id/passport'), { params: { id: 'PT-2026-0417' }, body: {}, user: { role: 'HOSPITAL_STAFF', email: 's' }, socket: {} });
  assert.strictEqual(o.code, 403);
});

test('store holds the token hash as key, never the raw token', () => {
  const t = tokenFor('PT-2026-0419');
  assert.ok(!store.passportTokens.has(t));
  assert.ok(store.passportTokens.has(passport.hashToken(t)));
  assert.strictEqual(open(t).code, 200);
});

test('rotate: the old link answers 410, the new one works; unknown token answers the same 410', () => {
  const a = tokenFor('PT-2026-0420'); const b = tokenFor('PT-2026-0420');
  assert.notStrictEqual(a, b);
  const old = open(a); const unknown = open('x'.repeat(24));
  assert.strictEqual(old.code, 410); assert.strictEqual(unknown.code, 410);
  assert.deepStrictEqual(old.body, unknown.body);
  assert.strictEqual(open(b).code, 200);
});

test('revoke makes the link 410 and the audit log never holds a token', () => {
  const t = tokenFor('PT-2026-0421');
  run(find('delete', '/patients/:id/passport'), { params: { id: 'PT-2026-0421' }, user: { role: 'PATIENT', email: 'n', patient_id: 'PT-2026-0421' }, socket: {} });
  assert.strictEqual(open(t).code, 410);
  assert.ok(!JSON.stringify(store.accessLog).includes(t));
});

test('public link is rate limited per address', () => {
  const t = tokenFor('PT-2026-0418'); let last;
  for (let i = 0; i < 31; i++) last = run(find('get', '/passport/:token'), { params: { token: t }, socket: { remoteAddress: 'one-ip' } });
  assert.strictEqual(last.code, 429);
});

test('anonymous quick view: only default-safe fields, masked phone, no clinical data', () => {
  const t = tokenFor('PT-2026-0417');
  const body = open(t).body;
  assert.strictEqual(body.demo, true);
  assert.match(body.patient_code, /^HT-\d{4}$/);
  assert.match(body.age_band, /^\d0-\d9$/);
  assert.ok(Array.isArray(body.allergies));
  assert.match(body.contact.phone_masked, /^\+91 XXXXX XXX\d\d$/);
  for (const k of ['conditions', 'medications', 'reports', 'contacts', 'vitals', 'location', 'email', 'token', 'age', 'patient_id']) assert.ok(!(k in body), k);
  assert.ok(!JSON.stringify(body).includes(t));
});

test('consent history off removes allergies and the contact on the next scan', () => {
  const t = tokenFor('PT-2026-0419'); const c = store.patients['PT-2026-0419'].consents; const before = c.history;
  c.history = false;
  const body = open(t).body;
  c.history = before;
  assert.ok(!('allergies' in body) && !('contact' in body));
  assert.ok(body.name);
});

test('the patient can switch QR fields off; unknown field names are refused', () => {
  const mk = (fields) => run(find('post', '/patients/:id/passport'), { params: { id: 'PT-2026-0420' }, body: { fields }, user: { role: 'PATIENT', email: 'r', patient_id: 'PT-2026-0420' }, socket: {} });
  assert.strictEqual(mk(['conditions']).code, 400);
  const ok = mk(['blood_group']);
  const body = open(ok.body.token).body;
  assert.ok(body.blood_group && !('allergies' in body) && !('contact' in body));
});
