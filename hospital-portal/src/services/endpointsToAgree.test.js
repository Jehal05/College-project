// Keeps docs/ENDPOINTS_TO_AGREE.md and the portal code in step. If you change a call in api.js, change the table (or the other way round).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateHospital, emptyHospitalForm } from './hospitalForm.js';
import { NOTE_KINDS as NOTE_KINDS_FOR_TEST } from './notes.js';

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const doc = read('../../docs/ENDPOINTS_TO_AGREE.md');
const api = read('./api.js');

const rows = (idPattern) => doc.split('\n').filter((l) => new RegExp(`^\\| ${idPattern} \\|`).test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const endpoints = rows('E\\d+').map(([id, method, path, , keys, , , , status, daksh]) => ({ id, method, path: path.replace(/`/g, ''), keys: keys.replace(/`/g, '').split(',').map((k) => k.trim()).filter(Boolean), status, daksh }));
const events = rows('EV\\d+');

// Every real-mode request('METHOD', path, body) call in api.js, with the path written as {id}.
const calls = [...api.matchAll(/request\('(GET|POST|PUT|PATCH|DELETE)',\s*(['`])([^'`]+)\2(?:,\s*([^)]*?))?\)/g)].map((m) => ({ method: m[1], path: m[3].replace(/\$\{[^}]+\}/g, '{id}'), body: m[4] || '' }));
const concerned = (c) => /\/(checklist|notes|chat)$/.test(c.path) || (/^\/hospitals/.test(c.path) && c.method !== 'GET' && !/availability$/.test(c.path));

test('the table has the six endpoints and two events', () => {
  assert.deepEqual(endpoints.map((e) => `${e.method} ${e.path}`), [
    'PATCH /emergencies/{id}/checklist', 'POST /emergencies/{id}/notes', 'POST /emergencies/{id}/chat',
    'POST /hospitals', 'PUT /hospitals/{id}', 'PATCH /hospitals/{id}/verify',
  ]);
  assert.deepEqual(events.map((r) => r[1]), ['`emergency.note`', '`chat.message`']);
});

test('every row is PROPOSED, or AGREED only with Daksh\'s answer written in the last column', () => {
  for (const r of [...endpoints, ...events.map(([id, , , status, daksh]) => ({ id, status, daksh }))]) {
    assert.match(r.status, /^(PROPOSED, not agreed|AGREED \(Daksh, written, [^)]+\))$/, `${r.id} status`);
    if (r.status.startsWith('AGREED')) assert.ok(r.daksh.length > 0, `${r.id} says AGREED but Daksh's answer is empty`);
    else assert.equal(r.daksh, '', `${r.id} is PROPOSED, so nobody has answered yet`);
  }
});

test('each row matches a real call in api.js (method and path), and every such call is in the table', () => {
  for (const e of endpoints) assert.ok(calls.some((c) => c.method === e.method && c.path === e.path), `${e.id}: api.js has no ${e.method} ${e.path}`);
  for (const c of calls.filter(concerned)) assert.ok(endpoints.some((e) => e.method === c.method && e.path === c.path), `api.js calls ${c.method} ${c.path} but the table does not list it`);
});

test('body keys in the table are the keys api.js sends', () => {
  for (const e of endpoints.filter((x) => /checklist|notes|chat|verify/.test(x.path))) {
    const call = calls.find((c) => c.method === e.method && c.path === e.path);
    const sent = [...call.body.matchAll(/(\w+)(?:\s*:|\s*[,}])/g)].map((m) => m[1]);
    for (const k of e.keys) assert.ok(new RegExp(`\\b${k}\\b`).test(call.body), `${e.id}: ${k} is not in the body api.js sends (${call.body})`);
    assert.ok(sent.length >= e.keys.length, `${e.id}: api.js sends fewer keys than the table lists`);
  }
});

test('hospital body (E4, E5) lists exactly the fields the form produces, and never id or verified', () => {
  const form = { ...emptyHospitalForm(), name: 'Test Care Hospital (Sample)', address: 'Sample road', phone: '+91-79-0000-0099', lat: '23.05', lng: '72.5',
    capabilities: { cath_lab: true, stroke_unit: true, icu: true, emergency: true }, availability: { beds_free: '5', icu_free: '1', cath_lab_ready: true, stroke_unit_ready: false } };
  const v = validateHospital(form).value;
  const keys = Object.keys(v);
  for (const e of endpoints.filter((x) => /^E[45]$/.test(x.id))) assert.deepEqual(e.keys, keys, `${e.id} keys`);
  assert.ok(!keys.includes('id') && !keys.includes('verified'));
  const section = doc.slice(doc.indexOf('### Hospital body'), doc.indexOf('### Note kinds'));
  for (const k of [...Object.keys(v.capabilities), ...Object.keys(v.availability)]) assert.ok(section.includes(`\`${k}\``) || section.includes(k), `Hospital body table lacks ${k}`);
});

test('the note kinds listed for E2 are exactly the kinds the portal sends', () => {
  const sent = new Set(NOTE_KINDS_FOR_TEST);
  for (const f of ['../components/AmbulanceProvider.jsx', '../components/TrackingMap.jsx', '../components/NearbyHelp.jsx', '../components/TeamAssignment.jsx', '../components/TakeOverBox.jsx']) {
    for (const m of read(f).matchAll(/addNote\(\s*[^,]+,\s*'(\w+)'/g)) sent.add(m[1]);
  }
  const line = doc.split('\n').find((l) => l.startsWith('`handover`'));
  const listed = [...line.matchAll(/`(\w+)`/g)].map((m) => m[1]).slice(0, 6);
  assert.deepEqual([...sent].sort(), [...listed].sort());
});
