import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActivity, filterActivity, redact, actorGroup, auditRows, auditError } from './activity.js';

const checklists = { HEART: [{ id: 'heart-1', text: 'Inform the on-call cardiology team' }] };
const cases = [
  {
    emergency_id: 'E1', type: 'HEART', created_at: '2026-11-13T08:00:00Z',
    status_events: [
      { state: 'SOS_SENT', timestamp: '2026-11-13T08:00:00Z', actor: 'Patient app' },
      { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: '2026-11-13T08:01:00Z', actor: 'Desk Staff' },
      { state: 'NOTE', kind: 'handover', note: 'Bay 2 ready', timestamp: '2026-11-13T08:03:00Z', actor: 'Desk Staff' },
      { state: 'NOTE', kind: 'pickup', note: 'Patient picked up (simulated)', timestamp: '2026-11-13T08:04:00Z', actor: 'Ambulance crew (simulated)' },
      { state: 'ESCALATED', timestamp: '2026-11-13T08:00:30Z', actor: 'System', note: 'Now alerting City Care' },
    ],
    checklist: { 'heart-1': { done: true, by: 'Desk Staff', at: '2026-11-13T08:02:00Z' }, 'heart-9': { done: false, by: 'Desk Staff', at: '2026-11-13T08:05:00Z' } },
  },
];

test('activity is built from timeline, notes and checklist ticks, newest first', () => {
  const a = buildActivity(cases, checklists);
  assert.equal(a.length, 7);
  assert.deepEqual(a.map((x) => x.ts), [...a.map((x) => x.ts)].sort((x, y) => Date.parse(y) - Date.parse(x)));
  assert.equal(a[0].text, 'Unticked: heart-9'); // unknown item id falls back to the id
  assert.ok(a.some((x) => x.text === 'Ticked: Inform the on-call cardiology team' && x.kind === 'checklist'));
  assert.ok(a.some((x) => x.text === 'Handover note: Bay 2 ready' && x.kind === 'note'));
  assert.ok(a.some((x) => x.text.startsWith('Escalated to the next hospital') && x.text.endsWith('(Now alerting City Care)')));
});

test('actor groups', () => {
  assert.equal(actorGroup('Patient app'), 'patient');
  assert.equal(actorGroup('Ambulance crew (simulated)'), 'ambulance');
  assert.equal(actorGroup('System (no acknowledgement in 30 s)'), 'system');
  assert.equal(actorGroup(null), 'system');
  assert.equal(actorGroup('Desk Staff'), 'staff');
});

test('filters: kind, who and text', () => {
  const a = buildActivity(cases, checklists);
  assert.equal(filterActivity(a, { kind: 'checklist' }).length, 2);
  assert.equal(filterActivity(a, { kind: 'note' }).length, 2);
  assert.equal(filterActivity(a, { who: 'staff' }).every((x) => x.who === 'staff'), true);
  assert.equal(filterActivity(a, { who: 'patient' }).length, 1);
  assert.equal(filterActivity(a, { text: 'bay 2' }).length, 1);
  assert.equal(filterActivity(a, { text: 'e1' }).length, 7);
  assert.equal(filterActivity(a, { text: 'nothing like this' }).length, 0);
  assert.equal(filterActivity(a).length, 7);
});

test('events with a bad time are skipped, not crashed on', () => {
  const a = buildActivity([{ emergency_id: 'E2', type: 'STROKE', created_at: 'x', status_events: [{ state: 'SOS_SENT', timestamp: 'garbage' }], checklist: { a: { done: true, at: 'nope' } } }], {});
  assert.equal(a.length, 0);
  assert.deepEqual(buildActivity(), []);
});

test('tokens and passwords never reach the screen', () => {
  assert.equal(redact('Authorization: Bearer abc.DEF-123_xyz'), 'Authorization: Bearer [hidden]');
  assert.equal(redact('see eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig_nature'), 'see [token hidden]');
  assert.equal(redact('url ws://x/ws?token=SECRET123 and password=hunter2'), 'url ws://x/ws?token=[hidden] and password=[hidden]');
  assert.equal(redact('A normal note about chest pain'), 'A normal note about chest pain');
  const withToken = buildActivity([{ emergency_id: 'E3', type: 'HEART', created_at: '2026-11-13T08:00:00Z', status_events: [{ state: 'NOTE', kind: 'desk', note: 'paste Bearer eyJabc.def.ghi oops', timestamp: '2026-11-13T08:00:00Z' }] }], {});
  assert.doesNotMatch(withToken[0].text, /eyJabc/);
});

test('audit rows keep only known fields (a stray token field is dropped)', () => {
  const rows = auditRows({ items: [{ id: 7, timestamp: '2026-11-16T10:04:12Z', user_id: 'usr_010', role: 'HOSPITAL_STAFF', action: 'passport.view', patient_id: 'pat_001', outcome: 'allowed', reason: null, fields_released: ['history'], token: 'SECRET', authorization: 'Bearer SECRET' }] });
  assert.deepEqual(rows[0], { id: 7, time: '2026-11-16T10:04:12Z', user: 'usr_010', role: 'HOSPITAL_STAFF', action: 'passport.view', patient: 'pat_001', outcome: 'allowed', reason: null, fields: ['history'] });
  assert.equal(JSON.stringify(rows).includes('SECRET'), false);
  assert.deepEqual(auditRows(null), []);
  assert.equal(auditRows([{ action: 'x' }]).length, 1);
});

test('audit errors: missing, forbidden, login, other', () => {
  assert.deepEqual(auditError({ status: 404, missing: true }), { kind: 'missing', text: 'The backend has no audit log yet.' });
  assert.equal(auditError({ status: 501 }).kind, 'missing');
  assert.equal(auditError({ status: 403 }).kind, 'forbidden');
  assert.equal(auditError({ status: 401 }).kind, 'login');
  assert.match(auditError({ status: 500, message: 'boom' }).text, /boom/);
});

test('activity rows keep the raw type code so the page can translate the name', () => {
  const rows = buildActivity([{ emergency_id: 'E9', type: 'STROKE', status_events: [{ state: 'SOS_SENT', timestamp: '2026-11-14T10:00:00.000Z', actor: 'Patient app' }] }], {});
  assert.equal(rows[0].type, 'STROKE');
  assert.equal(rows[0].type_label, 'Stroke');
});
