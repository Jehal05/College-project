// Reload without losing what arrived meanwhile (mergeLoaded, mergeTimelines).
import test from 'node:test';
import assert from 'node:assert/strict';
import { emergencyReducer, mergeLoaded, mergeTimelines, applyEvent } from './emergencyReducer.js';

const T0 = '2026-11-14T08:00:00.000Z';
const at = (s) => new Date(new Date(T0).getTime() + s * 1000).toISOString();
const base = (over = {}) => ({ emergency_id: 'E1', state: 'SOS_SENT', created_at: T0, severity: 'EMERGENCY', ...over });
const created = (list, over) => applyEvent(list, { event: 'emergency.created', emergency_id: over.emergency_id || 'E1', state: over.state || 'SOS_SENT', timestamp: over.created_at || T0, payload: { severity: 'EMERGENCY', ...over } });

test('a live event that arrived while the list loaded is not undone', () => {
  let list = created([], base());
  const startedAt = Date.parse(at(10));
  // The server snapshot was taken before the acknowledge ...
  list = applyEvent(list, { event: 'emergency.status', emergency_id: 'E1', state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(12) });
  const next = mergeLoaded(list, [base()], startedAt);
  assert.equal(next[0].state, 'HOSPITAL_ACKNOWLEDGED');
  assert.ok(next[0].status_events.some((e) => e.state === 'HOSPITAL_ACKNOWLEDGED'));
});
test('when the server is ahead, the server state wins and the timeline keeps both', () => {
  let list = created([], base());
  const loaded = base({ state: 'HOSPITAL_ACKNOWLEDGED', status_events: [{ state: 'SOS_SENT', timestamp: T0 }, { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(8) }] });
  const next = mergeLoaded(list, [loaded], 0);
  assert.equal(next[0].state, 'HOSPITAL_ACKNOWLEDGED');
  assert.equal(next[0].status_events.length, 2);
});
test('a new alert that arrived live during the load is kept', () => {
  const startedAt = Date.parse(at(10));
  let list = created([], base({ emergency_id: 'E2', created_at: at(11) }));
  list = list.map((e) => ({ ...e, flash_from: Date.parse(at(11)) }));
  const next = mergeLoaded(list, [base()], startedAt);
  assert.deepEqual(next.map((e) => e.emergency_id).sort(), ['E1', 'E2']);
});
test('an old alert the server no longer lists is dropped (it finished meanwhile)', () => {
  const list = created([], base({ emergency_id: 'OLD' }));
  const next = mergeLoaded(list, [base()], Date.parse(at(500)));
  assert.deepEqual(next.map((e) => e.emergency_id), ['E1']);
});
test('local notes and WebSocket-only timeline entries survive a reload', () => {
  let list = created([], base());
  list = applyEvent(list, { event: 'emergency.note', emergency_id: 'E1', timestamp: at(3), payload: { note_id: 'n1', kind: 'handover', note: 'Allergic to X (sample)', local_only: true } });
  list = applyEvent(list, { event: 'emergency.note', emergency_id: 'E1', timestamp: at(4), payload: { note: 'Corridor requested' } });
  const next = mergeLoaded(list, [base()], 0);
  const notes = next[0].status_events.filter((e) => e.state === 'NOTE');
  assert.equal(notes.length, 2);
  assert.ok(notes.some((n) => n.local_only));
});
test('the same note from the server and from the live feed is not doubled', () => {
  let list = created([], base());
  list = applyEvent(list, { event: 'emergency.note', emergency_id: 'E1', timestamp: at(3), payload: { note_id: 'n1', kind: 'desk', note: 'Hello' } });
  const loaded = base({ status_events: [{ state: 'SOS_SENT', timestamp: T0 }, { state: 'NOTE', kind: 'desk', note: 'Hello', note_id: 'n1', timestamp: at(3) }] });
  const next = mergeLoaded(list, [loaded], 0);
  assert.equal(next[0].status_events.filter((e) => e.state === 'NOTE').length, 1);
});
test('the same step reported a second apart by both sides is not doubled', () => {
  const merged = mergeTimelines([{ state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(5) }], [{ state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(6) }]);
  assert.equal(merged.length, 1);
});
test('local checklist ticks survive; the newer tick wins per item', () => {
  let list = created([], base());
  list = emergencyReducer(list, { type: 'checklist', id: 'E1', checklist: { a: { done: true, by: 'Me', at: at(9) }, b: { done: true, by: 'Me', at: at(1) } } });
  const loaded = base({ checklist: { b: { done: false, by: 'Server', at: at(5) } } });
  const next = mergeLoaded(list, [loaded], 0);
  assert.equal(next[0].checklist.a.done, true);
  assert.equal(next[0].checklist.b.done, false); // server tick is newer
});
test('read marks and the NEW mark are kept', () => {
  let list = created([], base());
  list = emergencyReducer(list, { type: 'read', id: 'E1' });
  const next = mergeLoaded(list, [base()], 0);
  assert.equal(next[0]._read, true);
  assert.equal(next[0]._new, true);
});
test('a reused id with a clearly different alert time becomes a fresh case', () => {
  let list = created([], base());
  list = emergencyReducer(list, { type: 'read', id: 'E1' });
  const next = mergeLoaded(list, [base({ created_at: at(3600) })], 0);
  assert.equal(next.length, 1);
  assert.equal(next[0]._read, false);
  assert.equal(next[0].created_at, at(3600));
});
test('escalation seen live (more recent than the list) keeps the new hospital', () => {
  let list = created([], base({ alerted_hospital_id: 'H1' }));
  list = applyEvent(list, { event: 'hospital.escalated', emergency_id: 'E1', timestamp: at(20), payload: { escalation_level: 1, from_hospital_id: 'H1', to_hospital_id: 'H2' } });
  const next = mergeLoaded(list, [base({ alerted_hospital_id: 'H1' })], 0);
  assert.equal(next[0].alerted_hospital_id, 'H2');
  assert.equal(next[0].state, 'ESCALATED');
  assert.deepEqual(next[0].alerted_ids, ['H1']);
});
test('an empty or missing loaded list does not crash and clears old cases', () => {
  const list = created([], base());
  assert.deepEqual(mergeLoaded(list, [], 0), []);
  assert.deepEqual(mergeLoaded(list, undefined, 0), []);
});
test('the load action goes through mergeLoaded', () => {
  let list = created([], base());
  list = emergencyReducer(list, { type: 'read', id: 'E1' });
  const next = emergencyReducer(list, { type: 'load', list: [base()], startedAt: 0 });
  assert.equal(next[0]._read, true);
});
test('a take-over made on this screen is kept after a reload', () => {
  let list = created([], base({ alerted_hospital_id: 'H1' }));
  list = applyEvent(list, { event: 'emergency.note', emergency_id: 'E1', timestamp: at(2), payload: { note_id: 't1', kind: 'desk', note: 'Taken over from X. Reason: Demo', fields: { taken_over_by: 'H2', taken_over_from: 'H1' } } });
  const next = mergeLoaded(list, [base({ alerted_hospital_id: 'H1' })], 0);
  assert.equal(next[0].taken_over_by, 'H2');
  assert.equal(next[0].taken_over_from, 'H1');
});

// ---- same id again (item 7) ----
import { isNewCaseWithOldId, SAME_ALERT_SECONDS } from './emergencyReducer.js';

test('same id, time within the window: the same case', () => assert.equal(isNewCaseWithOldId({ created_at: T0 }, at(SAME_ALERT_SECONDS - 1)), false));
test('same id, time far from every known start: a new case with an old id', () => assert.equal(isNewCaseWithOldId({ created_at: T0 }, at(3600)), true));
test('an early notice and the later SOS time belong to the same case (no wrong replace)', () => {
  const existing = { created_at: T0, sos_sent_at: at(40), status_events: [{ state: 'EMERGENCY_DETECTED', timestamp: T0 }, { state: 'SOS_SENT', timestamp: at(40) }] };
  assert.equal(isNewCaseWithOldId(existing, at(41)), false); // the created event is stamped when the SOS was confirmed
});
test('the list can name a start step the live event is close to', () => {
  const existing = { created_at: at(-60), status_events: [{ state: 'SOS_SENT', timestamp: T0 }] };
  assert.equal(isNewCaseWithOldId(existing, at(2)), false);
});
test('bad or missing times never count as a new case', () => {
  assert.equal(isNewCaseWithOldId({ created_at: T0 }, undefined), false);
  assert.equal(isNewCaseWithOldId({ created_at: 'nonsense' }, T0), false);
  assert.equal(isNewCaseWithOldId({}, T0), false);
});
test('a second created event with a skewed time does not replace a card that already progressed', () => {
  let list = created([], base());
  list = applyEvent(list, { event: 'emergency.status', emergency_id: 'E1', state: 'HOSPITAL_ACKNOWLEDGED', timestamp: at(8) });
  const again = applyEvent(list, { event: 'emergency.created', emergency_id: 'E1', state: 'SOS_SENT', timestamp: at(1), payload: { severity: 'EMERGENCY' } });
  assert.equal(again, list); // ignored as a repeat
});
test('a real reset (same id, much later time) still replaces the old card', () => {
  let list = created([], base());
  const after = applyEvent(list, { event: 'emergency.created', emergency_id: 'E1', state: 'SOS_SENT', timestamp: at(900), payload: { severity: 'EMERGENCY', created_at: at(900) } });
  assert.equal(after[0].created_at, at(900));
});
import { mergeDetails } from './emergencyReducer.js';
test('a detail that sends a severity clears the earlier "missing" mark', () => {
  const list = [{ emergency_id: 'E1', created_at: T0, severity: 'URGENT', severity_missing: true, state: 'SOS_SENT', status_events: [] }];
  const next = mergeDetails(list, { emergency_id: 'E1', severity: 'EMERGENCY' });
  assert.equal(next[0].severity, 'EMERGENCY');
  assert.ok(!next[0].severity_missing);
});
