// API contract test. Runs the SAME checks against the mock server or any real backend and prints PASS/FAIL per endpoint.
//   npm run contract                              (mock server on http://localhost:4000)
//   npm run contract -- https://api.example.com   (a real backend)
// Login: CONTRACT_EMAIL / CONTRACT_PASSWORD (default patient@demo.test / demo1234). Use a TEST patient: the checks create and
// delete contacts, reports, an emergency and a passport, and restore the language and consents. Spec: docs/API_CONTRACT.md.
const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const EMAIL = process.env.CONTRACT_EMAIL || 'patient@demo.test';
const PASSWORD = process.env.CONTRACT_PASSWORD || 'demo1234';
const results = [];
let token = null; let pid = null;

const call = async (method, path, { body, auth = true, raw, type } = {}) => {
  const headers = { ...(raw ? { 'Content-Type': type } : body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(auth && token ? { Authorization: 'Bearer ' + token } : {}) };
  const res = await fetch(BASE + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text, type: res.headers.get('content-type') || '' };
};
const fail = (msg) => { throw new Error(msg); };
const expectStatus = (r, ...codes) => { if (!codes.includes(r.status)) fail('expected HTTP ' + codes.join(' or ') + ' but got ' + r.status + ' ' + r.text.slice(0, 80)); };
// shape: { field: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'iso' | 'string|null' }
function expectShape(obj, shape, where = 'body') {
  if (!obj || typeof obj !== 'object') fail(where + ' is not an object');
  for (const [key, kind] of Object.entries(shape)) {
    const v = obj[key];
    const ok = kind === 'array' ? Array.isArray(v) : kind === 'iso' ? typeof v === 'string' && !Number.isNaN(Date.parse(v))
      : kind === 'string|null' ? v === null || typeof v === 'string' : kind === 'object' ? v && typeof v === 'object' && !Array.isArray(v) : typeof v === kind;
    if (!ok) fail(where + '.' + key + ' should be ' + kind + ' but is ' + JSON.stringify(v));
  }
}
const expectError = (r, ...codes) => { expectStatus(r, ...codes); if (!r.json || typeof r.json.error !== 'string') fail('error answers must be JSON like { "error": "text" }'); };
async function test(name, fn) {
  try { await fn(); results.push([name, true]); console.log('PASS ' + name); } catch (e) { results.push([name, false]); console.log('FAIL ' + name + '\n       ' + e.message); }
}
const P = () => '/patients/' + pid;

await test('GET /health', async () => { const r = await call('GET', '/health', { auth: false }); expectStatus(r, 200); expectShape(r.json, { status: 'string' }); });
await test('POST /auth/login wrong password -> 401 {error}', async () => expectError(await call('POST', '/auth/login', { auth: false, body: { email: EMAIL, password: 'wrong-password' } }), 401));
await test('POST /auth/login -> { token, role, patient_id }', async () => {
  const r = await call('POST', '/auth/login', { auth: false, body: { email: EMAIL, password: PASSWORD } }); expectStatus(r, 200);
  expectShape(r.json, { token: 'string', role: 'string', patient_id: 'string' }); if (r.json.role !== 'PATIENT') fail('role should be PATIENT for a patient login');
  token = r.json.token; pid = r.json.patient_id;
});
if (!token) { console.log('\nCannot continue without a login.'); process.exit(1); }
await test('protected endpoint without a token -> 401 {error}', async () => expectError(await call('GET', P(), { auth: false }), 401));
await test('GET /patients/:id', async () => {
  const r = await call('GET', P()); expectStatus(r, 200);
  expectShape(r.json, { id: 'string', name: 'string', age: 'number', blood_group: 'string', allergies: 'array', conditions: 'array', medications: 'array', language: 'string', contacts: 'array', consents: 'object' });
  expectShape(r.json.consents, { location: 'boolean', history: 'boolean', vitals: 'boolean', reports: 'boolean' }, 'consents');
});
await test('GET /patients/:id unknown -> 404 {error}', async () => expectError(await call('GET', '/patients/HT-DOES-NOT-EXIST'), 404, 403));
await test('PATCH /patients/:id (language) and back', async () => {
  const before = (await call('GET', P())).json.language; const r = await call('PATCH', P(), { body: { language: 'hi' } }); expectStatus(r, 200);
  if (r.json.language !== 'hi') fail('language was not saved'); await call('PATCH', P(), { body: { language: before } });
});
await test('GET /patients/:id/vitals', async () => { const r = await call('GET', P() + '/vitals'); expectStatus(r, 200); expectShape(r.json, { heart_rate: 'number', spo2: 'number', bp: 'string', glucose: 'number', timestamp: 'iso' }); });
await test('GET /patients/:id/baseline', async () => {
  const r = await call('GET', P() + '/baseline'); expectStatus(r, 200);
  for (const k of ['heart_rate', 'spo2', 'bp_systolic', 'bp_diastolic', 'glucose']) expectShape(r.json[k], { min: 'number', max: 'number' }, k);
});
await test('GET/PUT /patients/:id/consents', async () => {
  const g = await call('GET', P() + '/consents'); expectStatus(g, 200); expectShape(g.json, { consents: 'object', changes: 'array' });
  const bad = await call('PUT', P() + '/consents', { body: { location: 'yes' } }); expectError(bad, 400);
  const ok = await call('PUT', P() + '/consents', { body: g.json.consents }); expectStatus(ok, 200); expectShape(ok.json, { consents: 'object', changes: 'array' });
});
await test('contacts: list, create (201), invalid (400), update, delete (204), unknown (404)', async () => {
  const list = await call('GET', P() + '/contacts'); expectStatus(list, 200); if (!Array.isArray(list.json)) fail('contacts should be an array');
  if (list.json.length >= 5) fail('test patient already has 5 contacts; remove one first');
  const c = { name: 'Contract Test', relation: 'Friend', phone: '+91 00000 00099' };
  const made = await call('POST', P() + '/contacts', { body: c }); expectStatus(made, 201); expectShape(made.json, { id: 'string', name: 'string', relation: 'string', phone: 'string', is_primary: 'boolean' });
  expectError(await call('POST', P() + '/contacts', { body: { name: '', relation: 'Friend', phone: '12ab' } }), 400);
  const up = await call('PUT', P() + '/contacts/' + made.json.id, { body: { ...c, name: 'Contract Edited' } }); expectStatus(up, 200); if (up.json.name !== 'Contract Edited') fail('update not saved');
  expectStatus(await call('DELETE', P() + '/contacts/' + made.json.id), 204); expectError(await call('DELETE', P() + '/contacts/' + made.json.id), 404);
});
await test('reports: upload (201), list, file, wrong type (415), delete (204)', async () => {
  const up = await call('POST', P() + '/reports?name=contract.pdf', { raw: '%PDF-1.4 contract test', type: 'application/pdf' }); expectStatus(up, 201); expectShape(up.json, { id: 'string', name: 'string' });
  const list = await call('GET', P() + '/reports'); expectStatus(list, 200); if (!list.json.some((x) => x.id === up.json.id)) fail('uploaded report missing from the list'); if (list.json.some((x) => 'data' in x)) fail('list must not contain file bytes');
  const file = await call('GET', P() + '/reports/' + up.json.id + '/file'); expectStatus(file, 200); if (!file.type.includes('pdf')) fail('file should come back as application/pdf');
  expectError(await call('POST', P() + '/reports?name=x.txt', { raw: 'hello', type: 'text/plain' }), 415);
  expectStatus(await call('DELETE', P() + '/reports/' + up.json.id), 204);
});
await test('GET /hospitals', async () => {
  const r = await call('GET', '/hospitals'); expectStatus(r, 200); if (!r.json.length) fail('no hospitals');
  expectShape(r.json[0], { id: 'string', name: 'string', lat: 'number', lng: 'number', capabilities: 'array', available: 'boolean', verified: 'boolean', distance_km: 'number' });
});
let emergencyId = null;
await test('emergencies: create (201), invalid (400), get, sos, cancel, unknown (404)', async () => {
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH'] } }); expectStatus(made, 201);
  expectShape(made.json, { id: 'string', state: 'string', severity: 'string' }); if (made.json.state !== 'EMERGENCY_DETECTED') fail('new emergency should start as EMERGENCY_DETECTED'); emergencyId = made.json.id;
  expectError(await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['NOT_A_SYMPTOM'] } }), 400);
  const got = await call('GET', '/emergencies/' + emergencyId); expectStatus(got, 200); expectShape(got.json, { id: 'string', patient_id: 'string', type: 'string', symptoms: 'array', state: 'string', status_events: 'array' });
  const sos = await call('POST', '/emergencies/' + emergencyId + '/sos', { body: { location: { lat: 21.17, lng: 72.83, accuracy: 20, source: 'gps' } } }); expectStatus(sos, 200); expectShape(sos.json, { id: 'string', state: 'string' });
  const again = await call('POST', '/emergencies/' + emergencyId + '/sos', { body: {} }); expectStatus(again, 200); // sending twice is harmless
  const cancel = await call('POST', '/emergencies/' + emergencyId + '/cancel'); expectStatus(cancel, 200); if (cancel.json.state !== 'CANCELLED') fail('state should be CANCELLED');
  expectError(await call('GET', '/emergencies/E-DOES-NOT-EXIST'), 404);
});
await test('passport: create, public read, consent filter, log, revoke (410), unknown (410)', async () => {
  expectError(await call('POST', P() + '/passport', { body: { hours: 5 } }), 400);
  const made = await call('POST', P() + '/passport', { body: { hours: 1 } }); expectStatus(made, 201); expectShape(made.json, { token: 'string', expires_at: 'iso' });
  if (made.json.token.length < 22) fail('token must be at least 22 characters');
  const pub = await call('GET', '/passport/' + made.json.token, { auth: false }); expectStatus(pub, 200);
  expectShape(pub.json, { name: 'string', age: 'number', blood_group: 'string', expires_at: 'iso', shared: 'object' }); expectShape(pub.json.shared, { history: 'boolean' }, 'shared');
  const consents = (await call('GET', P() + '/consents')).json.consents; await call('PUT', P() + '/consents', { body: { ...consents, history: false } });
  const limited = await call('GET', '/passport/' + made.json.token, { auth: false });
  await call('PUT', P() + '/consents', { body: consents });
  for (const k of ['allergies', 'conditions', 'medications', 'contacts']) if (k in limited.json) fail('"' + k + '" must be left out when history consent is off');
  const log = await call('GET', P() + '/passport/log'); expectStatus(log, 200); if (!Array.isArray(log.json) || log.json.length < 2) fail('log should list the opens');
  if (log.json.some((e) => Object.keys(e).join() !== 'opened_at')) fail('log entries must contain only opened_at (no IP or device data)');
  expectStatus(await call('DELETE', P() + '/passport'), 200, 204);
  expectError(await call('GET', '/passport/' + made.json.token, { auth: false }), 410); expectError(await call('GET', '/passport/not-a-real-token-1234567', { auth: false }), 410);
});
await test('emergencies: source, reasons (never a diagnosis) and summary (Phase 6)', async () => {
  expectError(await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['CHEST_PAIN'], source: 'BOGUS' } }), 400);
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'UNKNOWN', symptoms: [], source: 'FALL_CHECK' } }); expectStatus(made, 201);
  const heart = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['CHEST_PAIN'], source: 'MANUAL' } }); expectStatus(heart, 201);
  const rs = await call('GET', '/emergencies/' + heart.json.id + '/reasons'); expectStatus(rs, 200);
  expectShape(rs.json, { severity: 'string', matched_rules: 'array', inputs: 'object', reviewed: 'boolean', simulated: 'boolean' });
  if (rs.json.reviewed !== false) fail('reasons.reviewed must be false until a doctor reviews the rules'); if (!rs.json.matched_rules.length) fail('chest pain should match at least one rule');
  expectShape(rs.json.matched_rules[0], { id: 'string', type: 'string', severity: 'string', reason: 'string', reviewed: 'boolean' }, 'matched_rules[0]');
  expectShape(rs.json.inputs, { symptoms: 'array', vitals: 'object' }, 'inputs');
  expectError(await call('GET', '/emergencies/E-DOES-NOT-EXIST/reasons'), 404);
  const sum = await call('GET', P() + '/emergencies/' + made.json.id + '/summary'); expectStatus(sum, 200);
  expectShape(sum.json, { id: 'string', started_at: 'iso', source: 'string', final_state: 'string', simulated: 'boolean', timeline: 'array', durations: 'object', shared: 'object', symptoms: 'array', contacts_notified: 'array' });
  if (sum.json.source !== 'FALL_CHECK') fail('source was not stored');
  for (const k of ['to_acknowledged', 'to_dispatched', 'to_arrived', 'to_handover']) if (!(k in sum.json.durations)) fail('durations.' + k + ' missing (use null)');
  const list = await call('GET', P() + '/emergencies'); expectStatus(list, 200); if (!Array.isArray(list.json) || !list.json.some((e) => e.id === made.json.id)) fail('emergency list should include the new one');
  expectError(await call('GET', P() + '/emergencies/E-DOES-NOT-EXIST/summary'), 404);
  await call('POST', '/emergencies/' + made.json.id + '/cancel'); await call('POST', '/emergencies/' + heart.json.id + '/cancel');
});
await test('preferences: GET/PUT safety check-in (small JSON, validated)', async () => {
  const g = await call('GET', P() + '/preferences'); expectStatus(g, 200); expectShape(g.json, { safety_checkin: 'object' }); expectShape(g.json.safety_checkin, { enabled: 'boolean', minutes: 'number' }, 'safety_checkin');
  expectError(await call('PUT', P() + '/preferences', { body: { safety_checkin: { enabled: 'yes', minutes: 7 } } }), 400);
  expectStatus(await call('PUT', P() + '/preferences', { body: g.json }), 200);
});
await test('reminders: create, list, update, taken, log, delete, limits (Phase 6)', async () => {
  const list = await call('GET', P() + '/reminders'); expectStatus(list, 200); if (!Array.isArray(list.json)) fail('reminders should be an array');
  if (list.json.length >= 8) fail('test patient already has 8 reminders');
  const r = { name: 'Contract medicine', dose_note: 'as written by your doctor', times: ['09:30'], days: [1, 2, 3] };
  const made = await call('POST', P() + '/reminders', { body: r }); expectStatus(made, 201); expectShape(made.json, { id: 'string', name: 'string', dose_note: 'string', times: 'array', days: 'array', paused: 'boolean' });
  expectError(await call('POST', P() + '/reminders', { body: { ...r, name: '' } }), 400); expectError(await call('POST', P() + '/reminders', { body: { ...r, name: 'x'.repeat(61) } }), 400);
  expectError(await call('POST', P() + '/reminders', { body: { ...r, times: ['25:99'] } }), 400);
  const up = await call('PUT', P() + '/reminders/' + made.json.id, { body: { ...r, paused: true } }); expectStatus(up, 200); if (up.json.paused !== true) fail('pause not saved');
  const slot = new Date().toISOString();
  expectStatus(await call('POST', P() + '/reminders/' + made.json.id + '/taken', { body: { scheduled_for: slot, at: slot } }), 200);
  expectError(await call('POST', P() + '/reminders/' + made.json.id + '/taken', { body: { at: slot } }), 400);
  const log = await call('GET', P() + '/reminders/log'); expectStatus(log, 200); if (!Array.isArray(log.json)) fail('log should be an array');
  if (log.json.length) expectShape(log.json[0], { reminder_id: 'string', scheduled_for: 'iso' }, 'log[0]');
  expectStatus(await call('DELETE', P() + '/reminders/' + made.json.id), 200, 204); expectError(await call('DELETE', P() + '/reminders/' + made.json.id), 404);
});
await test('demo: vitals profile, overrides, speed and state (Phase 6)', async () => {
  expectError(await call('POST', '/demo/vitals', { body: { profile: 'not-a-profile' } }), 400);
  expectError(await call('POST', '/demo/vitals', { body: { overrides: { spo2: 500 } } }), 400);
  const set = await call('POST', '/demo/vitals', { body: { profile: 'stroke', overrides: { heart_rate: 140 } } }); expectStatus(set, 200);
  const st = await call('GET', '/demo/state'); expectStatus(st, 200); expectShape(st.json, { speed: 'number', allowed_speeds: 'array', vitals: 'object' });
  if (st.json.vitals.profile !== 'stroke' || st.json.vitals.overrides.heart_rate !== 140) fail('profile and override should show in /demo/state');
  expectStatus(await call('POST', '/demo/vitals', { body: { overrides: { heart_rate: null } } }), 200);
  expectStatus(await call('POST', '/demo/vitals', { body: { overrides: {} } }), 200);
  expectError(await call('POST', '/demo/speed', { body: { multiplier: 3 } }), 400);
  const before = (await call('GET', '/demo/state')).json.speed; expectStatus(await call('POST', '/demo/speed', { body: { multiplier: 20 } }), 200);
  if ((await call('GET', '/demo/state')).json.speed !== 20) fail('speed should be echoed in /demo/state');
  await call('POST', '/demo/speed', { body: { multiplier: before } });
  const reset = await call('POST', '/demo/reset'); expectStatus(reset, 200, 204);
  if ((await call('GET', '/demo/state')).json.vitals.profile !== 'normal') fail('/demo/reset should return the profile to normal');
});
await test('WebSocket /ws: vitals.update and emergency events use { type, emergency_id, state, timestamp, payload }', async () => {
  if (typeof WebSocket === 'undefined') fail('needs Node 22+ (global WebSocket)');
  const events = []; const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws'); ws.onmessage = (m) => { try { events.push(JSON.parse(m.data)); } catch { /* ignore */ } };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('could not open ' + BASE.replace(/^http/, 'ws') + '/ws')); setTimeout(() => reject(new Error('timeout opening WebSocket')), 5000); });
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'STROKE', symptoms: ['FACE_DROOP'] } }); await call('POST', '/emergencies/' + made.json.id + '/sos', { body: {} });
  await new Promise((r) => setTimeout(r, 3500)); await call('POST', '/emergencies/' + made.json.id + '/cancel'); ws.close();
  const types = new Set(events.map((e) => e.type));
  for (const needed of ['vitals.update', 'emergency.created', 'emergency.sos_sent']) if (!types.has(needed)) fail('no "' + needed + '" event received (got: ' + [...types].join(', ') + ')');
  for (const e of events) { expectShape(e, { type: 'string', state: 'string', timestamp: 'iso', payload: 'object' }, e.type); if (!('emergency_id' in e)) fail(e.type + ' lacks emergency_id (use null for none)'); }
});

const passed = results.filter((r) => r[1]).length;
console.log('\nContract: ' + passed + '/' + results.length + ' passed against ' + BASE);
process.exit(passed === results.length ? 0 : 1);
