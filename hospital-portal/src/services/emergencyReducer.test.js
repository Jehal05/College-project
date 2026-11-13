import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, normalise, sortForQueue, mergeDetails } from './emergencyReducer.js';

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

test('queue order: open alerts newest first, closed ones at the bottom', () => {
  const list = [
    normalise({ emergency_id: 'old', state: 'SOS_SENT', created_at: '2026-11-13T08:00:00Z' }),
    normalise({ emergency_id: 'cancelled', state: 'CANCELLED', created_at: '2026-11-13T08:05:00Z' }),
    normalise({ emergency_id: 'new', state: 'EN_ROUTE', created_at: '2026-11-13T08:03:00Z' }),
  ];
  assert.deepEqual(sortForQueue(list).map((e) => e.emergency_id), ['new', 'old', 'cancelled']);
});

test('mergeDetails takes the timeline from the backend', () => {
  const merged = mergeDetails(base(), { emergency_id: 'E1', state: 'EN_ROUTE', status_events: [{ state: 'SOS_SENT', timestamp: 'a' }, { state: 'EN_ROUTE', timestamp: 'b' }] });
  assert.equal(merged[0].state, 'EN_ROUTE');
  assert.equal(merged[0].status_events.length, 2);
});
