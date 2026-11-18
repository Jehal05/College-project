import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, applyLive } from './emergencyReducer.js';
import { liveState, liveHeartRate, hasPosition, STALE_MS } from './liveView.js';

const base = { emergency_id: 'EM-1', state: 'SOS_SENT', created_at: '2026-01-01T00:00:00Z', status_events: [] };
const ev = (event, payload, timestamp = '2026-01-01T00:00:10Z') => ({ event, emergency_id: 'EM-1', state: 'SOS_SENT', timestamp, payload });

test('live.update fills the live object and later updates keep the earlier values', () => {
  let list = applyEvent([base], ev('live.update', { lat: 23.03, lng: 72.58, accuracy: 10, heart_rate: 141, hr_source: 'strap' }));
  assert.equal(list[0].live.heart_rate, 141);
  list = applyEvent(list, ev('live.update', { lat: 23.04, lng: 72.59 }, '2026-01-01T00:00:12Z'));
  assert.equal(list[0].live.lat, 23.04);
  assert.equal(list[0].live.heart_rate, 141, 'a position-only update keeps the last heart rate');
  assert.equal(list[0].live.sharing, true);
});

test('live.stopped keeps the last values but marks sharing off; unknown alert is ignored', () => {
  let list = applyEvent([base], ev('live.update', { lat: 1, lng: 2 }));
  list = applyEvent(list, ev('live.stopped', {}));
  assert.equal(list[0].live.sharing, false);
  assert.equal(list[0].live.lat, 1);
  assert.deepEqual(applyEvent([base], { ...ev('live.update', { lat: 1, lng: 2 }), emergency_id: 'EM-NOPE' }), [base]);
});

test('applyLive ignores non-numbers', () => {
  const l = applyLive(undefined, { lat: 'x', lng: 5, heart_rate: NaN }, 't');
  assert.equal(hasPosition(l), false);
  assert.equal(l.heart_rate, undefined);
});

test('liveState and liveHeartRate: fresh, quiet, stopped', () => {
  const t0 = Date.parse('2026-01-01T00:00:10Z');
  const live = { sharing: true, updated_at: '2026-01-01T00:00:10Z', heart_rate: 140, hr_at: '2026-01-01T00:00:10Z', lat: 1, lng: 2 };
  assert.equal(liveState(live, t0 + 3000).state, 'live');
  assert.equal(liveState(live, t0 + STALE_MS + 1000).state, 'quiet');
  assert.equal(liveHeartRate(live, t0 + 3000), 140);
  assert.equal(liveHeartRate(live, t0 + STALE_MS + 1000), null, 'an old number is not shown as current');
  assert.equal(liveState({ ...live, sharing: false }, t0).state, 'stopped');
  assert.equal(liveHeartRate({ ...live, sharing: false }, t0 + 60000), 140, 'after stop the last value is shown with the stopped label');
  assert.equal(liveState(undefined), null);
});
