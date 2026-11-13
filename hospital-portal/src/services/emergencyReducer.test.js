import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, normalise, sortForQueue, mergeDetails, countUnread, emergencyReducer } from './emergencyReducer.js';

const base = () => [normalise({ emergency_id: 'E1', state: 'SOS_SENT', created_at: '2026-11-13T08:00:00Z' })];
const ev = (event, state, extra = {}) => ({ event, emergency_id: 'E1', state, timestamp: '2026-11-13T08:00:10Z', payload: { actor: 'Desk' }, ...extra });

test('a new emergency starts with one timeline entry', () => {
  assert.deepEqual(base()[0].status_events, [{ state: 'SOS_SENT', timestamp: '2026-11-13T08:00:00Z', actor: 'Patient app' }]);
});

test('emergency.created adds a card at the top, once', () => {
  const msg = { event: 'emergency.created', emergency_id: 'E2', state: 'SOS_SENT', timestamp: '2026-11-13T08:01:00Z', payload: { type: 'STROKE' } };
  const list = applyEvent(base(), msg);
  assert.equal(list.length, 2);
  assert.equal(list[0].emergency_id, 'E2');
  assert.equal(list[0].type, 'STROKE');
  assert.equal(applyEvent(list, msg), list);
});

test('a state event updates the state and adds who and when to the timeline', () => {
  const list = applyEvent(base(), ev('hospital.acknowledged', 'HOSPITAL_ACKNOWLEDGED'));
  assert.equal(list[0].state, 'HOSPITAL_ACKNOWLEDGED');
  assert.deepEqual(list[0].status_events.at(-1), { state: 'HOSPITAL_ACKNOWLEDGED', timestamp: '2026-11-13T08:00:10Z', actor: 'Desk' });
});

test('a duplicate event changes nothing', () => {
  const once = applyEvent(base(), ev('hospital.acknowledged', 'HOSPITAL_ACKNOWLEDGED'));
  assert.equal(applyEvent(once, ev('hospital.acknowledged', 'HOSPITAL_ACKNOWLEDGED')), once);
});

test('a cancelled emergency ignores later events', () => {
  const cancelled = applyEvent(base(), ev('emergency.cancelled', 'CANCELLED'));
  const after = applyEvent(cancelled, ev('ambulance.dispatched', 'AMBULANCE_DISPATCHED'));
  assert.equal(after[0].state, 'CANCELLED');
  assert.equal(after[0].status_events.length, 2);
});

test('events for one emergency do not touch another', () => {
  let list = applyEvent(base(), { event: 'emergency.created', emergency_id: 'E2', state: 'SOS_SENT', timestamp: '2026-11-13T08:01:00Z', payload: {} });
  list = applyEvent(list, ev('hospital.acknowledged', 'HOSPITAL_ACKNOWLEDGED'));
  assert.equal(list.find((e) => e.emergency_id === 'E2').state, 'SOS_SENT');
  assert.equal(list.find((e) => e.emergency_id === 'E1').state, 'HOSPITAL_ACKNOWLEDGED');
});

test('events for unknown emergencies or without a state are ignored', () => {
  const list = base();
  assert.equal(applyEvent(list, { event: 'hospital.acknowledged', emergency_id: 'NOPE', state: 'HOSPITAL_ACKNOWLEDGED' }), list);
  assert.equal(applyEvent(list, { event: 'vitals.update', emergency_id: 'E1', payload: {} }), list);
});

test('queue order: severity first, then oldest first; closed ones at the bottom', () => {
  const mk = (id, severity, t, state = 'SOS_SENT') => normalise({ emergency_id: id, severity, state, created_at: `2026-11-13T08:0${t}:00Z` });
  const list = [
    mk('urgent-old', 'URGENT', 0),
    mk('cancelled', 'EMERGENCY', 1, 'CANCELLED'),
    mk('emerg-new', 'EMERGENCY', 5),
    mk('watch', 'WATCH', 2),
    mk('emerg-old', 'EMERGENCY', 3, 'HOSPITAL_ACKNOWLEDGED'),
    mk('done', 'EMERGENCY', 4, 'HANDOVER_DONE'),
  ];
  assert.deepEqual(sortForQueue(list).map((e) => e.emergency_id), ['emerg-old', 'emerg-new', 'urgent-old', 'watch', 'done', 'cancelled']);
});

test('three alerts arriving at once sort by severity, and none is hidden', () => {
  let list = [];
  const at = '2026-11-13T08:00:00Z';
  for (const [id, severity] of [['a', 'WATCH'], ['b', 'EMERGENCY'], ['c', 'URGENT']]) {
    list = applyEvent(list, { event: 'emergency.created', emergency_id: id, state: 'SOS_SENT', timestamp: at, payload: { severity } });
  }
  assert.equal(list.length, 3);
  assert.deepEqual(sortForQueue(list).map((e) => e.emergency_id), ['b', 'c', 'a']);
  assert.equal(countUnread(list), 3);
});

test('opening an alert marks it read; closed alerts are not counted as unread', () => {
  let list = base();
  assert.equal(countUnread(list), 1);
  list = emergencyReducer(list, { type: 'read', id: 'E1' });
  assert.equal(countUnread(list), 0);
  const cancelled = applyEvent(base(), ev('emergency.cancelled', 'CANCELLED'));
  assert.equal(countUnread(cancelled), 0);
});

test('reloading the list keeps read marks', () => {
  const list = emergencyReducer(base(), { type: 'read', id: 'E1' });
  const reloaded = emergencyReducer(list, { type: 'load', list: [{ emergency_id: 'E1', state: 'SOS_SENT', created_at: '2026-11-13T08:00:00Z' }, { emergency_id: 'E9', created_at: '2026-11-13T08:02:00Z' }] });
  assert.equal(reloaded.find((e) => e.emergency_id === 'E1')._read, true);
  assert.equal(reloaded.find((e) => e.emergency_id === 'E9')._read, false);
});

const esc = (level, to, from) => ({ event: 'hospital.escalated', emergency_id: 'E1', state: 'ESCALATED', timestamp: `2026-11-13T08:00:${30 * level}Z`, payload: { escalation_level: level, from_hospital_id: from, to_hospital_id: to, to_hospital_name: `Hospital ${to}` } });

test('hospital.escalated marks ESCALATED, records the hospitals and adds a timeline entry', () => {
  const start = [{ ...base()[0], alerted_hospital_id: 'H2' }];
  const list = applyEvent(start, esc(1, 'H4', 'H2'));
  assert.equal(list[0].state, 'ESCALATED');
  assert.equal(list[0].alerted_hospital_id, 'H4');
  assert.deepEqual(list[0].alerted_ids, ['H2']);
  assert.equal(list[0].escalated_to_name, 'Hospital H4');
  assert.equal(list[0].status_events.at(-1).note, 'Now alerting Hospital H4');
  assert.equal(applyEvent(list, esc(1, 'H4', 'H2')), list, 'duplicate is ignored');
});

test('an alert can escalate a second time', () => {
  let list = applyEvent([{ ...base()[0], alerted_hospital_id: 'H2' }], esc(1, 'H4', 'H2'));
  list = applyEvent(list, esc(2, 'H3', 'H4'));
  assert.equal(list[0].escalation_level, 2);
  assert.deepEqual(list[0].alerted_ids, ['H2', 'H4']);
  assert.equal(list[0].status_events.filter((e) => e.state === 'ESCALATED').length, 2);
});

test('an escalated alert can still be acknowledged; a late escalation is then ignored', () => {
  let list = applyEvent(base(), esc(1, 'H4', 'H2'));
  list = applyEvent(list, ev('hospital.acknowledged', 'HOSPITAL_ACKNOWLEDGED'));
  assert.equal(list[0].state, 'HOSPITAL_ACKNOWLEDGED');
  assert.equal(applyEvent(list, esc(2, 'H3', 'H4')), list);
});

test('hospital.alerted records which hospital has the alert', () => {
  const list = applyEvent(base(), { event: 'hospital.alerted', emergency_id: 'E1', state: 'SOS_SENT', payload: { hospital_id: 'H2' } });
  assert.equal(list[0].alerted_hospital_id, 'H2');
  assert.equal(list[0].status_events.length, 1);
});

test('mergeDetails takes the timeline from the backend', () => {
  const merged = mergeDetails(base(), { emergency_id: 'E1', state: 'EN_ROUTE', status_events: [{ state: 'SOS_SENT', timestamp: 'a' }, { state: 'EN_ROUTE', timestamp: 'b' }] });
  assert.equal(merged[0].state, 'EN_ROUTE');
  assert.equal(merged[0].status_events.length, 2);
});
