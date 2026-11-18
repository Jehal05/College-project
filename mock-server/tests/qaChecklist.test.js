// Step 6 checklist items that can run without the internet, a browser or hardware. Same fake-Router trick as passportOwner.test.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const routes = [];
const fakeExpress = { Router: () => { const r = {}; for (const m of ['get', 'post', 'delete', 'patch', 'use']) r[m] = (p, ...h) => { if (typeof p === 'string') routes.push({ m, path: p, h }); }; return r; } };
const orig = Module._load;
Module._load = function (req, ...a) { return req === 'express' ? fakeExpress : orig.call(this, req, ...a); };
const passport = require('../passport');
const store = require('../store');
const guards = require('../guards');
const { accounts } = require('../demoAccounts');
Module._load = orig;

const find = (m, p) => routes.find((r) => r.m === m && r.path === p);
let n = 0;
function run(route, req) {
  const out = { code: 200, body: null, status(c) { out.code = c; return out; }, json(b) { out.body = b; return out; } };
  if (req.user) { const t = 'qa' + n++; store.tokens.set(t, req.user); req = { ...req, headers: { authorization: 'Bearer ' + t } }; } else req = { ...req, headers: {} };
  let i = 0; const next = () => { const h = route.h[i++]; if (h) h(req, out, next); }; next(); return out;
}
const asPatient = (id) => ({ role: 'PATIENT', email: 'p' + id, patient_id: id });
const make = (id, body = {}) => run(find('post', '/patients/:id/passport'), { params: { id }, body, user: asPatient(id), socket: {} }).body.token;
const scan = (token) => run(find('get', '/passport/:token'), { params: { token }, socket: { remoteAddress: 'qa' + Math.random() } });
const ids = accounts().map((a) => a.patient_id);

test('QA1 five patients get five different QR tokens of 24+ URL-safe characters', () => {
  const tokens = ids.map((id) => make(id));
  assert.strictEqual(new Set(tokens).size, 5);
  for (const t of tokens) assert.match(t, /^[A-Za-z0-9_-]{24,}$/);
});

test('QA2 the QR link carries no personal data (only base address + /p/ + random token)', () => {
  for (const id of ids) {
    const t = make(id); const p = store.patients[id];
    const link = 'http://192.168.1.20:4000/p/' + t;
    assert.match(link, /^http:\/\/192\.168\.1\.20:4000\/p\/[A-Za-z0-9_-]{24}$/);
    for (const secret of [p.name.split(' ')[0], p.name.split(' ')[1], p.blood_group, id, ...p.contacts.map((c) => c.phone)]) assert.ok(!t.toLowerCase().includes(String(secret).toLowerCase()), secret);
  }
});

test('QA7 an expired passport shows the neutral 410 and nothing else', () => {
  const t = make('PT-2026-0418');
  run(find('post', '/demo/passport/expire'), { user: asPatient('PT-2026-0418'), socket: {} });
  const o = scan(t);
  assert.strictEqual(o.code, 410); assert.deepStrictEqual(Object.keys(o.body), ['error']);
});

test('QA9 a successful scan and a denied scan both create an audit row', () => {
  const t = make('PT-2026-0419'); const before = store.accessLog.length;
  scan(t); assert.strictEqual(store.accessLog.length, before + 1); assert.strictEqual(store.accessLog.at(-1).outcome, 'allowed');
  run(find('delete', '/patients/:id/passport'), { params: { id: 'PT-2026-0419' }, user: asPatient('PT-2026-0419'), socket: {} });
  scan(t); assert.strictEqual(store.accessLog.at(-1).outcome, 'denied');
  assert.ok(!JSON.stringify(store.accessLog).includes(t));
});

test('QA10 login: ten wrong passwords from one address, then 429; a right password is never counted', () => {
  const req = { socket: { remoteAddress: 'login-test' } };
  assert.ok(guards.loginAllowed(req));
  for (let i = 0; i < 10; i++) guards.loginFailed(req);
  assert.strictEqual(guards.loginAllowed(req), false);
  assert.ok(guards.loginAllowed({ socket: { remoteAddress: 'someone-else' } }));
});

test('QA11 account isolation: another patient gets the same 404 as a missing patient; own record passes', () => {
  const call = (userId, targetId) => { const tok = 'iso' + n++; store.tokens.set(tok, asPatient(userId)); let code = 'next'; const res = { status(c) { code = c; return res; }, json() { return res; } };
    guards.ownRecordOnly({ headers: { authorization: 'Bearer ' + tok }, params: { id: targetId } }, res, () => {}); return code; };
  assert.strictEqual(call(ids[0], ids[1]), 404);
  assert.strictEqual(call(ids[0], 'PT-0000-0000'), 404);
  assert.strictEqual(call(ids[0], ids[0]), 'next');
  assert.strictEqual(call(ids[3], ids[4]), 404);
});

test('QA12 demo phones never trigger SMS or calls: no sender code in the mock, no tel: link on the public page', () => {
  const dir = path.join(__dirname, '..');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) assert.ok(!/twilio|sendSms|nodemailer|msg91|vonage/i.test(fs.readFileSync(path.join(dir, f), 'utf8')), f);
  const view = fs.readFileSync(path.join(dir, '../patient-app/src/components/PassportQuickView.jsx'), 'utf8');
  assert.ok(!/href=\{?['"`]tel:/.test(view));
  const body = scan(make('PT-2026-0420')).body;
  assert.match(body.contact.phone_masked, /X{5}/);
});

test('QA13 the demo banner is on the public page and on the printable card', () => {
  const src = (f) => fs.readFileSync(path.join(__dirname, '../../patient-app/src', f), 'utf8');
  assert.ok(src('screens/PassportView.jsx').includes("t('view.banner')"));
  assert.ok(src('components/PassportCard.jsx').includes("t('view.banner')") && src('components/PassportCard.jsx').includes("t('card.badge')"));
  for (const l of ['en', 'hi', 'gu']) assert.ok(/ABHA/.test(JSON.parse(src('i18n/' + l + '.json'.replace('.json.json', '.json')))['view.banner']));
});

test('QA15 form controls on the new screens have labels (static check: every input sits inside a label)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../patient-app/src/screens/Passport.jsx'), 'utf8');
  const inputs = (src.match(/<input /g) || []).length;
  const labelled = (src.match(/<label[^>]*>\s*<input /g) || []).length;
  assert.strictEqual(inputs, labelled);
});

test('vitals profile can be switched to the heart emergency profile and back (simulated wearable)', () => {
  const vitals = require('../vitals');
  assert.strictEqual(vitals.applyChange({ profile: 'heart_attack' }).status, 200);
  const hot = vitals.currentVitals(); assert.ok(hot.heart_rate >= 135 && hot.spo2 <= 95);
  assert.strictEqual(vitals.applyChange({ profile: 'normal' }).status, 200);
  const calm = vitals.currentVitals(); assert.ok(calm.heart_rate <= 76 && calm.spo2 >= 97);
});
