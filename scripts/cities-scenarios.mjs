// Two-city scenarios on the MOCK server (the practice-emergency flow, city choice and the other-city rule).
//   npm run mock   (DEMO_SPEED=10 makes the timeline fast)   then   node scripts/cities-scenarios.mjs [http://localhost:4000]
// Every number below comes from the data files (cities.json and the seed hospitals), nothing is typed in by hand.
const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + extra)); if (!ok) failures += 1; };
const login = async (email) => (await (await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'demo1234' }) })).json());
const api = (token) => async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch { /* none */ }
  return { status: r.status, json };
};
const patient = await login('patient@demo.test'); const admin = await login('admin@demo.test');
const P = api(patient.token); const A = api(admin.token);
const cities = (await P('GET', '/cities')).json; const amd = cities.find((c) => c.city_id === 'AMD'); const pnq = cities.find((c) => c.city_id === 'PNQ');
const sos = async (type, symptoms, location) => {
  const made = (await P('POST', '/emergencies', { patient_id: patient.patient_id, type, symptoms })).json;
  const sent = (await P('POST', '/emergencies/' + made.id + '/sos', { location })).json;
  return { id: made.id, sent, full: (await P('GET', '/emergencies/' + made.id)).json };
};
const at = (c) => ({ ...c.simulation_start, accuracy: 20, source: 'gps' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await A('POST', '/demo/reset');
let r = await sos('HEART', ['CHEST_PAIN'], at(pnq));
check('a heart SOS in Pune goes to a Pune hospital', r.sent.hospital.id.startsWith('HSP-PNQ-') && r.full.city_id === 'PNQ', JSON.stringify(r.sent.hospital));
check('...and does not say "other city"', !r.sent.hospital.other_city);
r = await sos('HEART', ['CHEST_PAIN'], at(amd));
check('a heart SOS in Ahmedabad still goes to an Ahmedabad hospital', r.sent.hospital.id.startsWith('HSP-AMD-') && r.full.city_id === 'AMD', JSON.stringify(r.sent.hospital));
const delhi = { lat: 28.61, lng: 77.21, accuracy: 20, source: 'gps' };
await P('PATCH', '/patients/' + patient.patient_id, { home_city_id: 'PNQ' });
r = await sos('STROKE', ['FACE_DROOP'], delhi);
check('a location far from every city uses the home city start (source simulated)', r.full.city_id === 'PNQ' && r.full.location.source === 'simulated' && r.full.location.lat === pnq.simulation_start.lat, JSON.stringify(r.full.location));
await P('PATCH', '/patients/' + patient.patient_id, { home_city_id: 'AMD' });

// Pune loses every cath lab: the heart alert goes to Ahmedabad and says so.
for (const h of (await A('GET', '/hospitals?city_id=PNQ')).json.filter((x) => x.capabilities.cath_lab)) await A('PATCH', '/hospitals/' + h.id + '/availability', { cath_lab_ready: false });
r = await sos('HEART', ['CHEST_PAIN'], at(pnq));
check('no ready cath lab in Pune: the alert goes to Ahmedabad and says so', r.sent.hospital.id.startsWith('HSP-AMD-') && r.sent.hospital.other_city === true && /Pune/.test(r.sent.hospital.note || ''), JSON.stringify(r.sent.hospital));
check('...but the emergency stays a Pune emergency', r.full.city_id === 'PNQ');
let p = await A('POST', '/demo/reset'); check('reset answers ok', p.json && p.json.ok === true);
check('reset restores both cities (10 hospitals, 10 ambulances)', (await A('GET', '/hospitals')).json.length === 10 && (await A('GET', '/ambulances')).json.length === 10);
r = await sos('HEART', ['CHEST_PAIN'], at(pnq));
check('after the reset a Pune heart SOS is a Pune hospital again', r.sent.hospital.id.startsWith('HSP-PNQ-'));

// The practice emergency and its ambulance stay inside the chosen city.
for (const city of [pnq, amd]) {
  await A('POST', '/demo/reset');
  const made = await P('POST', '/demo/scenario', { type: 'HEART', city_id: city.city_id });
  let e = null;
  for (let i = 0; i < 60; i += 1) { e = (await P('GET', '/emergencies/' + made.json.id)).json; if (e.ambulance && e.state !== 'SOS_SENT') break; await sleep(500); }
  const prefix = city.city_id;
  check('practice emergency in ' + city.city_name + ': hospital and ambulance are both ' + prefix, e && e.hospital.id.startsWith('HSP-' + prefix) && e.ambulance && e.ambulance.id.startsWith('AMB-' + prefix), JSON.stringify(e && [e.hospital, e.ambulance]));
  check('...and it started at the city start from cities.json', e.location.lat === city.simulation_start.lat && e.location.lng === city.simulation_start.lng);
}
check('a practice emergency with an unknown city is a 400', (await P('POST', '/demo/scenario', { type: 'HEART', city_id: 'XYZ' })).status === 400);
await A('POST', '/demo/reset');
console.log(failures ? '\n' + failures + ' scenario(s) failed' : '\nAll two-city scenarios passed');
process.exit(failures ? 1 : 0);
