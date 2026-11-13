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
// optional: true marks a Phase 6 extra (reminders, safety check-in setting). A backend may skip these in its first pass:
// a failure prints OPTIONAL FAIL and does not make the run fail. Everything else is a core check.
const optionalResults = [];
async function test(name, fn, { optional = false } = {}) {
  try { await fn(); (optional ? optionalResults : results).push([name, true]); console.log('PASS ' + (optional ? '(optional) ' : '') + name); }
  catch (e) { (optional ? optionalResults : results).push([name, false]); console.log((optional ? 'OPTIONAL FAIL ' : 'FAIL ') + name + '\n       ' + e.message); }
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
  expectShape(r.json[0], { id: 'string', name: 'string', lat: 'number', lng: 'number', capabilities: 'object', availability: 'object', verified: 'boolean', distance_km: 'number' });
});
let emergencyId = null;
await test('emergencies: create (201), invalid (400), get, sos, cancel, unknown (404)', async () => {
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH'] } }); expectStatus(made, 201);
  expectShape(made.json, { id: 'string', state: 'string', severity: 'string' }); if (made.json.state !== 'EMERGENCY_DETECTED') fail('new emergency should start as EMERGENCY_DETECTED'); emergencyId = made.json.id;
  expectError(await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['NOT_A_SYMPTOM'] } }), 400);
  const got = await call('GET', '/emergencies/' + emergencyId); expectStatus(got, 200); expectShape(got.json, { id: 'string', patient_id: 'string', type: 'string', symptoms: 'array', state: 'string', status_events: 'array' });
  const sos = await call('POST', '/emergencies/' + emergencyId + '/sos', { body: { location: { lat: 23.0225, lng: 72.5714, accuracy: 20, source: 'gps' } } }); expectStatus(sos, 200); expectShape(sos.json, { id: 'string', state: 'string' });
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
}, { optional: true });
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
}, { optional: true });
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
await test("Daksh's names (backend/CONTRACT.md v0.6): detail, username login, timeline, consent history and changed, passport ?token", async () => {
  const bad = await call('POST', '/auth/login', { auth: false, body: { username: 'nobody', password: 'x' } }); expectError(bad, 401); if (typeof bad.json.detail !== 'string') fail('errors should also carry "detail"');
  const g = await call('GET', P() + '/consents'); expectShape(g.json, { patient_id: 'string', consents: 'object', simulated: 'boolean' });
  const first = Object.keys(g.json.consents)[0]; const put = await call('PUT', P() + '/consents', { body: { [first]: !g.json.consents[first] } }); expectStatus(put, 200);
  if (!Array.isArray(put.json.changed) || put.json.changed.join() !== first) fail('PUT should answer with changed: ["' + first + '"] and accept a single flag');
  await call('PUT', P() + '/consents', { body: { [first]: g.json.consents[first] } });
  const h = await call('GET', P() + '/consents/history'); expectStatus(h, 200); if (!Array.isArray(h.json.history) || !h.json.history.length) fail('history should list the changes');
  expectShape(h.json.history[0], { field: 'string', granted: 'boolean', timestamp: 'iso', actor_role: 'string' }, 'history[0]');
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, consent: { location: true, history: true, vitals: true, reports: true }, symptoms: ['chest_pain', 'breathlessness'] } }); expectStatus(made, 201);
  if (made.json.type !== 'HEART') fail('type is optional: the rules engine should decide HEART from chest_pain'); if (!Array.isArray(made.json.reasons) || made.json.reasons.some((x) => typeof x !== 'string')) fail('POST /emergencies "reasons" should be a list of strings');
  const got = await call('GET', '/emergencies/' + made.json.id); if (!Array.isArray(got.json.timeline) || !('seconds_since_start' in got.json.timeline[0])) fail('GET /emergencies/:id should have timeline with seconds_since_start');
  const pass = await call('POST', P() + '/passport', { body: { hours: 1 } }); const viaToken = await call('GET', '/passport/' + pid + '?token=' + pass.json.token, { auth: false }); expectStatus(viaToken, 200);
  expectError(await call('GET', '/passport/PT-9999-0000?token=' + pass.json.token, { auth: false }), 403); expectError(await call('GET', '/passport/' + pid + '?token=garbage', { auth: false }), 401);
  await call('DELETE', P() + '/passport'); await call('POST', '/emergencies/' + made.json.id + '/cancel');
});
await test('WebSocket /ws: vitals.update and emergency events use { type, emergency_id, state, timestamp, payload }', async () => {
  if (typeof WebSocket === 'undefined') fail('needs Node 22+ (global WebSocket)');
  const events = []; const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws?token=' + token); ws.onmessage = (m) => { try { events.push(JSON.parse(m.data)); } catch { /* ignore */ } };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('could not open ' + BASE.replace(/^http/, 'ws') + '/ws?token=' + token)); setTimeout(() => reject(new Error('timeout opening WebSocket')), 5000); });
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'STROKE', symptoms: ['FACE_DROOP'] } }); await call('POST', '/emergencies/' + made.json.id + '/sos', { body: {} });
  await new Promise((r) => setTimeout(r, 3500)); await call('POST', '/emergencies/' + made.json.id + '/cancel'); ws.close();
  const types = new Set(events.map((e) => e.type));
  if (!events.every((e) => e.event === e.type)) fail('every event should carry "event" (Daksh) equal to "type" (ours)');
  for (const needed of ['vitals.update', 'emergency.created', 'emergency.sos_sent']) if (!types.has(needed)) fail('no "' + needed + '" event received (got: ' + [...types].join(', ') + ')');
  for (const e of events) { expectShape(e, { type: 'string', state: 'string', timestamp: 'iso', payload: 'object' }, e.type); if (!('emergency_id' in e)) fail(e.type + ' lacks emergency_id (use null for none)'); }
});

await test('Phase 7: created event at SOS (patient, location, vitals gated by consent), hospital.alerted hospital_id + rank, lists, ambulances', async () => {
  if (typeof WebSocket === 'undefined') fail('needs Node 22+ (global WebSocket)');
  const events = []; const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws?token=' + token); ws.onmessage = (m) => { try { events.push(JSON.parse(m.data)); } catch { /* ignore */ } };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('could not open WebSocket')); setTimeout(() => reject(new Error('timeout')), 5000); });
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['CHEST_PAIN'], consents: { location: false, history: true, vitals: true, reports: true } } }); expectStatus(made, 201);
  await new Promise((r) => setTimeout(r, 600));
  if (events.some((e) => e.emergency_id === made.json.id && e.type === 'emergency.created')) fail('emergency.created must not be sent before the SOS');
  await call('POST', '/emergencies/' + made.json.id + '/sos', { body: { location: { lat: 23.0225, lng: 72.5714, accuracy: 20, source: 'gps' } } });
  await new Promise((r) => setTimeout(r, 2500)); await call('POST', '/emergencies/' + made.json.id + '/cancel'); ws.close();
  const mine = events.filter((e) => e.emergency_id === made.json.id);
  const created = mine.find((e) => e.type === 'emergency.created'); if (!created) fail('no emergency.created after the SOS');
  expectShape(created.payload, { type: 'string', severity: 'string', symptoms: 'array', source: 'string', patient_id: 'string', created_at: 'iso', patient: 'object', hospital: 'object', vitals: 'object' }, 'created.payload');
  if ('location' in created.payload) fail('location must be left out (not null) when the patient did not consent');
  if (created.payload.patient.allergies === undefined) fail('history consent given: patient.allergies should be there');
  const alerted = mine.find((e) => e.type === 'hospital.alerted'); if (!alerted) fail('no hospital.alerted');
  expectShape(alerted.payload, { hospital_id: 'string', rank: 'number' }, 'alerted.payload');
  const active = await call('GET', '/emergencies?status=active'); expectStatus(active, 200); if (!Array.isArray(active.json)) fail('GET /emergencies?status=active should be an array');
  const amb = await call('GET', '/ambulances'); expectStatus(amb, 200); expectShape(amb.json[0], { id: 'string', call_sign: 'string', lat: 'number', lng: 'number', status: 'string' }, 'ambulances[0]');
});
await test('hospital steps: 403 for a patient token, 409 for an invalid move (state does not allow it), 400 for an unknown ambulance', async () => {
  // Deliberately NOT sent to SOS: the state stays EMERGENCY_DETECTED, so the answers do not depend on the demo speed.
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['CHEST_PAIN'] } }); expectStatus(made, 201);
  for (const [path, body] of [['/ack', {}], ['/dispatch', { ambulance_id: 'AMB-AMD-02' }], ['/status', { state: 'ARRIVED' }]]) expectStatus(await call('POST', '/emergencies/' + made.json.id + path, { body }), 403);
  const patientToken = token;
  const login = await call('POST', '/auth/login', { auth: false, body: { email: 'staff@demo.test', password: PASSWORD } }); expectStatus(login, 200); token = login.json.token;
  try {
    const bad = await call('POST', '/emergencies/' + made.json.id + '/status', { body: { state: 'ARRIVED' } }); expectStatus(bad, 409);
    if (bad.json.detail !== 'Invalid transition' || bad.json.error !== 'Invalid transition' || bad.json.from !== 'EMERGENCY_DETECTED' || bad.json.to !== 'ARRIVED') fail('409 body should be { error, detail: "Invalid transition", from, to }, got ' + bad.text);
    expectStatus(await call('POST', '/emergencies/' + made.json.id + '/ack', { body: {} }), 409);
    expectStatus(await call('POST', '/emergencies/' + made.json.id + '/dispatch', { body: { ambulance_id: 'nope' } }), 400);
  } finally { token = patientToken; await call('POST', '/emergencies/' + made.json.id + '/cancel'); }
});
await test('portal logins: staff@demo / demo123 gives role "staff" and a hospital_id', async () => {
  const r = await call('POST', '/auth/login', { auth: false, body: { email: 'staff@demo', password: 'demo123' } }); expectStatus(r, 200);
  expectShape(r.json, { token: 'string', role: 'string', hospital_id: 'string' }); if (r.json.role !== 'staff') fail('portal dialect role should be "staff"');
});

// ---------------- Phase 9: staff passport, availability, escalation, WebSocket login, audit ----------------
const loginAs = async (email) => { const r = await call('POST', '/auth/login', { auth: false, body: { email, password: PASSWORD } }); expectStatus(r, 200); return r.json; };
const asUser = async (who, fn) => { const keep = token; token = who.token; try { return await fn(); } finally { token = keep; } };
await test('Phase 9: staff passport GET /passport/{patient_id} honours the history consent (401 no login, 403 other patient, 404 unknown patient) and QR token still works', async () => {
  const staff = await loginAs('staff@demo.test'); const before = (await call('GET', P() + '/consents')).json.consents;
  try {
    await call('PUT', P() + '/consents', { body: { ...before, history: true } });
    const on = await asUser(staff, () => call('GET', '/passport/' + pid)); expectStatus(on, 200);
    expectShape(on.json, { name: 'string', age: 'number', shared: 'object' }, 'passport'); if (!Array.isArray(on.json.allergies) || !Array.isArray(on.json.medications)) fail('history on: allergies and medications should be lists');
    await call('PUT', P() + '/consents', { body: { ...before, history: false } });
    const off = await asUser(staff, () => call('GET', '/passport/' + pid)); expectStatus(off, 200);
    for (const k of ['allergies', 'conditions', 'medications', 'contacts']) if (k in off.json) fail('history off: "' + k + '" must be left out');
    if (off.json.shared.history !== false) fail('history off: shared.history should be false');
  } finally { await call('PUT', P() + '/consents', { body: before }); }
  expectError(await call('GET', '/passport/' + pid, { auth: false }), 401);
  expectError(await call('GET', '/passport/PT-9999-0000'), 403);
  expectError(await asUser(staff, () => call('GET', '/passport/PT-9999-0000')), 404);
  const pass = await call('POST', P() + '/passport', { body: { hours: 1 } }); expectStatus(await call('GET', '/passport/' + pass.json.token, { auth: false }), 200); await call('DELETE', P() + '/passport');
});
await test('Phase 9: GET /audit is admin only and lists staff passport views without tokens', async () => {
  const staff = await loginAs('staff@demo.test'); const admin = await loginAs('admin@demo.test');
  await asUser(staff, () => call('GET', '/passport/' + pid));
  expectError(await call('GET', '/audit'), 403); expectError(await asUser(staff, () => call('GET', '/audit')), 403);
  const r = await asUser(admin, () => call('GET', '/audit?page=1&page_size=50')); expectStatus(r, 200); if (!Array.isArray(r.json.rows)) fail('audit should answer { rows: [...] }');
  const row = r.json.rows.find((x) => x.action === 'passport.staff_view'); if (!row) fail('no passport.staff_view row');
  expectShape(row, { at: 'iso', user: 'string', role: 'string', action: 'string', outcome: 'string', fields: 'array' }, 'audit row');
  if (/token|password/i.test(JSON.stringify(r.json))) fail('the audit log must never show tokens or passwords');
});
await test('Phase 9: PATCH /hospitals/{id}/availability (staff own hospital, both key names, 400 / 403 / 404)', async () => {
  const staff = await loginAs('staff@demo.test'); const admin = await loginAs('admin@demo.test'); if (!staff.hospital_id) fail('staff login should carry hospital_id');
  const list = (await call('GET', '/hospitals')).json; const mine = list.find((h) => h.id === staff.hospital_id); const other = list.find((h) => h.id !== staff.hospital_id);
  const patch = (who, id, body) => asUser(who, () => call('PATCH', '/hospitals/' + id + '/availability', { body }));
  const original = { beds_free: mine.availability.beds_free, icu_free: mine.availability.icu_free };
  try {
    const ok = await patch(staff, mine.id, { beds_free: 7 }); expectStatus(ok, 200); if (ok.json.id !== mine.id || ok.json.availability.beds_free !== 7) fail('answer should be the updated hospital');
    if ((await call('GET', '/hospitals')).json.find((h) => h.id === mine.id).availability.beds_free !== 7) fail('GET /hospitals should show the change');
    const alias = await patch(staff, mine.id, { icu_beds: 1 }); expectStatus(alias, 200); if (alias.json.availability.icu_free !== 1 || alias.json.availability.icu_beds !== 1) fail('icu_beds and icu_free should both show 1');
    expectError(await patch(staff, mine.id, { wifi: true }), 400); expectError(await patch(staff, mine.id, { beds_free: -3 }), 400); expectError(await patch(staff, mine.id, { cath_lab_ready: 'yes' }), 400);
    expectError(await patch(staff, other.id, { beds_free: 1 }), 403); expectError(await patch({ token }, mine.id, { beds_free: 1 }), 403);
    expectError(await patch(admin, 'HSP-NOPE-999', { beds_free: 1 }), 404); expectStatus(await patch(admin, other.id, { beds_free: other.availability.beds_free }), 200);
  } finally { await patch(staff, mine.id, original); }
});
await test('Phase 9: no acknowledgement in time -> hospital.escalated { escalation_level, from_hospital_id, to_hospital_id, to_hospital_name } then hospital.alerted (mock only; skipped on a backend without /demo/no-ack)', async () => {
  const arm = await call('POST', '/demo/no-ack', { body: { enabled: true, escalate_after_seconds: 2 } });
  if ([404, 405, 501].includes(arm.status)) { console.log('       (skipped: this backend has no /demo/no-ack)'); return; } expectStatus(arm, 200);
  const events = []; const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws?token=' + token); ws.onmessage = (m) => { try { events.push(JSON.parse(m.data)); } catch { /* ignore */ } };
  await new Promise((resolve, reject) => { ws.onopen = resolve; setTimeout(() => reject(new Error('timeout opening WebSocket')), 5000); });
  const made = await call('POST', '/emergencies', { body: { patient_id: pid, type: 'HEART', symptoms: ['CHEST_PAIN'] } }); await call('POST', '/emergencies/' + made.json.id + '/sos', { body: {} });
  try {
    let esc = null; for (let i = 0; i < 60 && !esc; i++) { await new Promise((r) => setTimeout(r, 250)); esc = events.find((e) => e.emergency_id === made.json.id && e.type === 'hospital.escalated'); }
    if (!esc) fail('no hospital.escalated within 15 s'); expectShape(esc.payload, { escalation_level: 'number', from_hospital_id: 'string', to_hospital_id: 'string', to_hospital_name: 'string' }, 'escalated.payload');
    if (esc.payload.from_hospital_id === esc.payload.to_hospital_id) fail('the alert must move to a different hospital');
    await new Promise((r) => setTimeout(r, 500));
    const alerted = events.filter((e) => e.emergency_id === made.json.id && e.type === 'hospital.alerted'); if (!alerted.some((e) => e.payload.hospital_id === esc.payload.to_hospital_id)) fail('no hospital.alerted for the new hospital');
  } finally { await call('POST', '/emergencies/' + made.json.id + '/cancel'); await call('POST', '/demo/no-ack', { body: { enabled: false } }); ws.close(); }
});
await test('Phase 9: WebSocket needs a login: no token or a wrong token is closed with 1008, a first {"type":"auth"} message works', async () => {
  const url = BASE.replace(/^http/, 'ws') + '/ws';
  const closeCode = (u) => new Promise((resolve) => { const w = new WebSocket(u); w.onclose = (e) => resolve(e.code); setTimeout(() => resolve('still open'), 9000); });
  if ((await closeCode(url + '?token=wrong-token')) !== 1008) fail('a wrong token should close with 1008');
  if ((await closeCode(url)) !== 1008) fail('no token should close with 1008');
  const got = await new Promise((resolve) => { const w = new WebSocket(url); w.onopen = () => w.send(JSON.stringify({ type: 'auth', token })); w.onmessage = () => { w.close(); resolve(true); }; w.onclose = () => resolve(false); setTimeout(() => resolve(false), 5000); });
  if (!got) fail('a first auth message with a good token should start the event stream');
});

const passed = results.filter((r) => r[1]).length;
const optPassed = optionalResults.filter((r) => r[1]).length;
console.log('\nContract: ' + passed + '/' + results.length + ' core checks passed against ' + BASE + (optionalResults.length ? ' (optional Phase 6 extras: ' + optPassed + '/' + optionalResults.length + ')' : ''));
process.exit(passed === results.length ? 0 : 1);
