import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNote, counterText, staffNotes, handoverNotes, canAddNote, MAX_NOTE_LENGTH } from './notes.js';
import { applyEvent, normalise } from './emergencyReducer.js';
import { buildReport, reportToText } from './report.js';

test('a note must have text and at most 500 characters', () => {
  assert.equal(checkNote('').ok, false);
  assert.equal(checkNote('   ').ok, false);
  assert.equal(checkNote('Patient on warfarin, tell CT.').ok, true);
  assert.equal(checkNote('x'.repeat(500)).ok, true);
  const long = checkNote('x'.repeat(501));
  assert.equal(long.ok, false);
  assert.match(long.error, /1 characters too long \(limit 500\)/);
  assert.equal(MAX_NOTE_LENGTH, 500);
});

test('the counter shows used / limit, and the text is trimmed when saved', () => {
  assert.equal(counterText('abc'), '3 / 500');
  assert.equal(counterText(''), '0 / 500');
  assert.equal(checkNote('  hello  ').text, 'hello');
  assert.equal(checkNote('x'.repeat(490)).remaining, 10);
  assert.equal(checkNote('x'.repeat(510)).remaining, -10);
});

const base = () => [normalise({ emergency_id: 'E1', state: 'HOSPITAL_ACKNOWLEDGED', created_at: '2026-11-13T08:00:00Z' })];
const note = (kind, text, t, extra = {}) => ({ event: 'emergency.note', emergency_id: 'E1', timestamp: t, payload: { kind, note: text, actor: 'Desk A', ...extra } });

test('handover and desk notes are kept, in time order, with who and when', () => {
  let list = applyEvent(base(), note('desk', 'Family on the way', '2026-11-13T08:02:00Z'));
  list = applyEvent(list, note('handover', 'Cath lab ready; patient allergic to iodine contrast', '2026-11-13T08:01:00Z'));
  list = applyEvent(list, note('pickup', 'Patient picked up (simulated)', '2026-11-13T08:03:00Z'));
  const notes = staffNotes(list[0].status_events);
  assert.deepEqual(notes.map((n) => n.kind), ['handover', 'desk']); // pickup is not a staff note
  assert.equal(notes[0].actor, 'Desk A');
  assert.equal(handoverNotes(list[0].status_events).length, 1);
});

test('a note that only exists on this screen is marked local-only', () => {
  const list = applyEvent(base(), note('handover', 'Local note', '2026-11-13T08:01:00Z', { local_only: true }));
  assert.equal(staffNotes(list[0].status_events)[0].localOnly, true);
  const saved = applyEvent(base(), note('handover', 'Saved note', '2026-11-13T08:01:00Z'));
  assert.equal(staffNotes(saved[0].status_events)[0].localOnly, false);
});

test('a duplicate note event adds nothing', () => {
  const once = applyEvent(base(), note('desk', 'Same', '2026-11-13T08:01:00Z', { note_id: 'N-1' }));
  assert.equal(applyEvent(once, note('desk', 'Same', '2026-11-13T08:01:00Z', { note_id: 'N-1' })), once);
});

test('closed cases take no notes', () => {
  assert.equal(canAddNote('SOS_SENT'), true);
  assert.equal(canAddNote('ARRIVED'), true);
  assert.equal(canAddNote('HANDOVER_DONE'), false);
  assert.equal(canAddNote('CANCELLED'), false);
});

test('the report has a Shift handover section and the text report prints it', () => {
  let list = applyEvent(base(), note('handover', 'Bay 2 reserved', '2026-11-13T08:01:00Z'));
  list = applyEvent(list, note('desk', 'Called cardiology', '2026-11-13T08:02:00Z'));
  const r = buildReport(list[0], {});
  assert.deepEqual(r.handover.map((n) => n.text), ['Bay 2 reserved']);
  assert.deepEqual(r.desk_notes.map((n) => n.text), ['Called cardiology']);
  const txt = reportToText(r);
  assert.match(txt, /SHIFT HANDOVER\n\s+\d.*Bay 2 reserved/);
  assert.match(txt, /DESK NOTES\n\s+\d.*Called cardiology/);
  const none = reportToText(buildReport(base()[0], {}));
  assert.match(none, /SHIFT HANDOVER\n\s+No handover note/);
});

test('report keeps its older notes list unchanged for pickup, assignment and corridor notes', () => {
  const list = applyEvent(base(), note('pickup', 'Patient picked up (simulated)', '2026-11-13T08:01:00Z'));
  const r = buildReport(list[0], {});
  assert.equal(r.notes.length, 1);
  assert.equal(r.handover.length, 0);
});
