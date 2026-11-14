import test from 'node:test';
import assert from 'node:assert/strict';
import { handoverSheet, needsDetails } from './handoverSheet.js';

const ev = (state, t, extra = {}) => ({ state, timestamp: `2026-11-14T10:${t}:00.000Z`, ...extra });
const note = (kind, text, t) => ev('NOTE', t, { kind, note: text, actor: 'Desk' });
const mk = (id, state, severity, events, extra = {}) => ({ emergency_id: id, patient_id: `P-${id}`, type: 'HEART', severity, state, created_at: '2026-11-14T10:00:00.000Z', alerted_hospital_id: 'h1', status_events: events, ...extra });

test('only open cases are listed; finished, cancelled and early notices are left out', () => {
  const sheet = handoverSheet([
    mk('A', 'HOSPITAL_ACKNOWLEDGED', 'EMERGENCY', [ev('SOS_SENT', '00')]),
    mk('B', 'HANDOVER_DONE', 'EMERGENCY', []),
    mk('C', 'CANCELLED', 'URGENT', []),
    mk('D', 'EMERGENCY_DETECTED', 'EMERGENCY', []),
  ]);
  assert.deepEqual(sheet.cases.map((c) => c.emergency_id), ['A']);
});

test('only handover notes are shown (not desk notes), oldest first, with who wrote them', () => {
  const sheet = handoverSheet([mk('A', 'EN_ROUTE', 'EMERGENCY', [ev('SOS_SENT', '00'), note('handover', 'Second', '20'), note('desk', 'Private working note', '10'), note('handover', 'First', '05')])]);
  assert.deepEqual(sheet.cases[0].notes.map((n) => n.text), ['First', 'Second']);
  assert.equal(sheet.cases[0].notes[0].actor, 'Desk');
  assert.equal(sheet.noteCount, 2);
  assert.equal(sheet.withNotes, 1);
});

test('a case with no handover note still appears (so the sheet shows what is missing)', () => {
  const sheet = handoverSheet([mk('A', 'SOS_SENT', 'URGENT', [ev('SOS_SENT', '00')])]);
  assert.equal(sheet.cases.length, 1);
  assert.deepEqual(sheet.cases[0].notes, []);
  assert.equal(sheet.withNotes, 0);
});

test('order: EMERGENCY before URGENT, then the older case first; hospital name is looked up', () => {
  const sheet = handoverSheet([
    mk('U', 'SOS_SENT', 'URGENT', [], { created_at: '2026-11-14T09:00:00.000Z' }),
    mk('E2', 'SOS_SENT', 'EMERGENCY', [], { created_at: '2026-11-14T10:30:00.000Z' }),
    mk('E1', 'SOS_SENT', 'EMERGENCY', [], { created_at: '2026-11-14T10:10:00.000Z', alerted_hospital_id: null }),
  ], (id) => `Hospital ${id}`);
  assert.deepEqual(sheet.cases.map((c) => c.emergency_id), ['E1', 'E2', 'U']);
  assert.equal(sheet.cases[0].hospital, null);
  assert.equal(sheet.cases[1].hospital, 'Hospital h1');
  assert.deepEqual(handoverSheet(null).cases, []);
});

test('a list item with one event or none needs the full details', () => {
  assert.equal(needsDetails({ status_events: [ev('SOS_SENT', '00')] }), true);
  assert.equal(needsDetails({}), true);
  assert.equal(needsDetails({ status_events: [ev('SOS_SENT', '00'), ev('HOSPITAL_ACKNOWLEDGED', '01')] }), false);
});
