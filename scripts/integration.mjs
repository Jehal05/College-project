// Integration check: plays one whole emergency and confirms the live events that the OTHER apps need arrive in the agreed shape.
//   npm run integration                          starts its own mock server on port 4200 (fast: 10x speed)
//   npm run integration -- http://host:port      checks a server that is already running (normal speed: takes about a minute)
// At the end it prints, for each teammate, the events they can copy their code from.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const given = process.argv[2];
const BASE = (given || 'http://localhost:4200').replace(/\/$/, '');
let server = null;
if (!given) {
  server = spawn('node', ['server.js'], { cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../mock-server'), env: { ...process.env, PORT: '4200', DEMO_SPEED: '10' }, stdio: 'ignore' });
  process.on('exit', () => server.kill());
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + '/health')).ok) break; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 250)); }
}
const STATES = ['MONITORING', 'SYMPTOMS_REPORTED', 'EMERGENCY_DETECTED', 'SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE'];
const problems = []; const problem = (m) => { problems.push(m); console.log('FAIL ' + m); }; const ok = (m) => console.log('PASS ' + m);
const api = async (method, p, token, body) => (await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })).json().catch(() => ({}));

const login = await api('POST', '/auth/login', null, { email: 'patient@demo.test', password: 'demo1234' });
if (!login.token) { console.log('FAIL login'); process.exit(1); }
const tok = login.token; await api('POST', '/demo/reset', tok);
const events = []; const t0 = Date.now(); const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws');
ws.onmessage = (m) => { const e = JSON.parse(m.data); if (e.type !== 'vitals.update') events.push({ ...e, at: Date.now() - t0 }); };
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('cannot open the WebSocket')); });

const made = await api('POST', '/emergencies', tok, { patient_id: 'HT-1001', type: 'HEART', symptoms: ['CHEST_PAIN', 'SHORT_BREATH'], source: 'MANUAL' });
await api('POST', '/emergencies/' + made.id + '/sos', tok, { location: { lat: 21.17, lng: 72.83, accuracy: 20, source: 'gps' } });
const passport = await api('POST', '/patients/HT-1001/passport', tok, { hours: 1 }); await api('GET', '/passport/' + passport.token);
for (let i = 0; i < 400 && !events.some((e) => e.type === 'emergency.handover_done'); i++) await new Promise((r) => setTimeout(r, 250));
ws.close(); await api('DELETE', '/patients/HT-1001/passport', tok);

const mine = events.filter((e) => e.emergency_id === made.id || e.type === 'passport.opened');
const SHAPE = ['type', 'emergency_id', 'state', 'timestamp', 'payload'];
const bad = mine.filter((e) => SHAPE.some((k) => !(k in e)) || typeof e.payload !== 'object' || Number.isNaN(Date.parse(e.timestamp)));
bad.length ? problem(bad.length + ' events do not have the shape { type, emergency_id, state, timestamp, payload }') : ok('all ' + mine.length + ' events have the agreed shape');
const unknown = mine.filter((e) => !STATES.includes(e.state) && !['CANCELLED', 'ESCALATED'].includes(e.state)); unknown.length ? problem('unknown states: ' + unknown.map((e) => e.state)) : ok('every state is one of the shared states');
const seen = mine.filter((e) => e.emergency_id === made.id).map((e) => STATES.indexOf(e.state)); const backwards = seen.some((s, i) => i && s < seen[i - 1]);
backwards ? problem('states went backwards') : ok('states only move forward');
const REQUIRED = ['emergency.created', 'emergency.sos_sent', 'hospital.alerted', 'hospital.acknowledged', 'ambulance.dispatched', 'ambulance.location', 'emergency.arrived', 'emergency.handover_done', 'contacts.notified', 'passport.opened'];
const types = new Set(mine.map((e) => e.type)); const missing = REQUIRED.filter((t) => !types.has(t)); missing.length ? problem('missing events: ' + missing.join(', ')) : ok('all ' + REQUIRED.length + ' event types arrived');
const notified = mine.find((e) => e.type === 'contacts.notified');
notified && JSON.stringify(notified).match(/\+?\d{8,}/) ? problem('contacts.notified contains a phone number') : ok('contacts.notified has names only (no phone numbers)');
const loc = mine.find((e) => e.type === 'ambulance.location'); loc && typeof loc.payload.lat === 'number' && typeof loc.payload.eta_seconds === 'number' ? ok('ambulance.location carries lat, lng and eta_seconds') : problem('ambulance.location lacks lat/lng/eta_seconds');
const created = mine.find((e) => e.type === 'emergency.created');
created && created.payload.source === 'MANUAL' ? ok('emergency.created carries source') : problem('emergency.created lacks payload.source');
created && created.payload.reasons && Array.isArray(created.payload.reasons.matched_rules) && created.payload.reasons.reviewed === false ? ok('emergency.created carries reasons (matched_rules, reviewed:false)') : problem('emergency.created lacks payload.reasons');
const reasonText = created ? JSON.stringify(created.payload.reasons) : '';
/diagnos|probab|score/i.test(reasonText) ? problem('reasons contain a diagnosis, score or probability word') : ok('reasons contain no diagnosis, score or probability');

console.log('\nEvent sequence (ms after start):');
for (const e of mine) console.log('  ' + String(e.at).padStart(6) + '  ' + e.type.padEnd(26) + e.state);
const sample = (t) => { const e = mine.find((x) => x.type === t); return e ? '  ' + JSON.stringify({ type: e.type, emergency_id: e.emergency_id, state: e.state, timestamp: e.timestamp, payload: e.payload }) : '  (not received)'; };
console.log('\nFor Puneet (hospital dashboard, map, ambulance): subscribe to ws://<server>/ws and use these:');
['emergency.sos_sent', 'hospital.alerted', 'ambulance.dispatched', 'ambulance.location', 'emergency.arrived'].forEach((t) => console.log(sample(t)));
console.log('  To acknowledge or dispatch for real, the backend must emit hospital.acknowledged / ambulance.dispatched in this shape.');
console.log('\nFor Shagun (family, responder, admin): use these:');
['contacts.notified', 'emergency.handover_done', 'passport.opened'].forEach((t) => console.log(sample(t)));
console.log('  Responder passport page: GET /passport/<token> (no login). The QR holds only <app>/p/<token>.');
console.log('\nIntegration: ' + (problems.length ? problems.length + ' problem(s)' : 'all checks passed'));
process.exit(problems.length ? 1 : 0);
