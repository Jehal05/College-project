import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldFlash, showNewBadge, FLASH_MS } from './alertFlags.js';
import { applyEvent } from './emergencyReducer.js';

const created = (state, extra = {}) => ({ event: 'emergency.created', emergency_id: 'E1', state, timestamp: '2026-11-13T08:00:00Z', received_at: 1_000_000, payload: { type: 'HEART', severity: 'EMERGENCY' }, ...extra });

test('a real SOS flashes for 5 seconds from when it arrived, then stops', () => {
  const [a] = applyEvent([], created('SOS_SENT'));
  assert.equal(shouldFlash(a, 1_000_000), true);
  assert.equal(shouldFlash(a, 1_000_000 + FLASH_MS - 1), true);
  assert.equal(shouldFlash(a, 1_000_000 + FLASH_MS), false);
});

test('an early notice never flashes', () => {
  const [a] = applyEvent([], created('EMERGENCY_DETECTED'));
  assert.equal(shouldFlash(a, 1_000_000), false);
  assert.equal(showNewBadge(a), false);
});

test('an early notice older than 5 s that becomes SOS still flashes from that moment', () => {
  let list = applyEvent([], created('EMERGENCY_DETECTED', { received_at: 1_000_000 }));
  const sos = { event: 'emergency.state', emergency_id: 'E1', state: 'SOS_SENT', timestamp: '2026-11-13T08:00:30Z', received_at: 1_060_000, payload: {} };
  const before = list;
  list = applyEvent(list, sos);
  assert.notEqual(list, before);
  assert.equal(list[0].sos_sent_at, '2026-11-13T08:00:30Z');
  assert.equal(shouldFlash(list[0], 1_060_000 + 100), true); // 60 s after the notice, but just after SOS
  assert.equal(shouldFlash(list[0], 1_060_000 + FLASH_MS + 1), false);
  assert.equal(showNewBadge(list[0]), true);
});

test('a cancelled alert never flashes', () => {
  let list = applyEvent([], created('SOS_SENT'));
  list = applyEvent(list, { event: 'emergency.cancelled', emergency_id: 'E1', state: 'CANCELLED', timestamp: '2026-11-13T08:00:02Z', received_at: 1_002_000, payload: {} });
  assert.equal(shouldFlash(list[0], 1_002_100), false);
  assert.equal(showNewBadge(list[0]), false);
});

test('escalated to this desk: flashes again from the escalation', () => {
  let list = applyEvent([], created('SOS_SENT'));
  list = list.map((e) => ({ ...e, _new: false, _read: true, alerted_hospital_id: 'h1' }));
  list = applyEvent(list, { event: 'hospital.escalated', emergency_id: 'E1', state: 'ESCALATED', timestamp: '2026-11-13T08:01:00Z', received_at: 2_000_000, payload: { escalation_level: 1, from_hospital_id: 'h1', to_hospital_id: 'h2' } });
  assert.equal(list[0].state, 'ESCALATED');
  assert.equal(shouldFlash(list[0], 2_000_100), true);
  assert.equal(showNewBadge(list[0]), true);
});

test('an opened alert shows no NEW badge', () => {
  const [a] = applyEvent([], created('SOS_SENT'));
  assert.equal(showNewBadge({ ...a, _read: true }), false);
});
