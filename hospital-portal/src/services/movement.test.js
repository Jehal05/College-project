import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMode, decideTrip, movementSource, movementText, classifyLocationEvent, BACKEND_WAIT_MS } from './movement.js';

test('parseMode accepts auto/true/false and falls back to auto', () => {
  assert.equal(parseMode('true'), 'true');
  assert.equal(parseMode('false'), 'false');
  assert.equal(parseMode(undefined), 'auto');
  assert.equal(parseMode('yes'), 'auto');
});

test('decideTrip: true always starts, false never starts', () => {
  assert.equal(decideTrip({ mode: 'true', useMock: false, backendSeen: true }), 'start');
  assert.equal(decideTrip({ mode: 'false', useMock: true }), 'skip');
});

test('decideTrip auto + mock mode: portal trip runs', () => {
  assert.equal(decideTrip({ mode: 'auto', useMock: true }), 'start');
});

test('decideTrip auto + real mode: wait 3 s for the backend, then start; skip if the backend already moves it', () => {
  assert.equal(decideTrip({ mode: 'auto', useMock: false, elapsedMs: 0 }), 'wait');
  assert.equal(decideTrip({ mode: 'auto', useMock: false, elapsedMs: BACKEND_WAIT_MS - 1 }), 'wait');
  assert.equal(decideTrip({ mode: 'auto', useMock: false, elapsedMs: BACKEND_WAIT_MS }), 'start');
  assert.equal(decideTrip({ mode: 'auto', useMock: false, backendSeen: true, elapsedMs: 10 }), 'skip');
});

test('movementSource and text', () => {
  assert.equal(movementSource({ mode: 'auto', useMock: true }), 'portal');
  assert.equal(movementSource({ mode: 'false', useMock: false }), 'backend');
  assert.equal(movementSource({ mode: 'auto', useMock: false, backendSeen: true, portalTripRunning: true }), 'backend');
  assert.equal(movementSource({ mode: 'auto', useMock: false, portalTripRunning: true }), 'portal');
  assert.equal(movementText('portal'), 'Ambulance movement: simulated by the portal');
  assert.equal(movementText('backend'), 'Ambulance movement: simulated by the backend');
});

test('classifyLocationEvent: local, echo of our own post, or backend', () => {
  const now = 100_000;
  const posts = [{ at: now - 1000, lat: 23.0301, lng: 72.5801 }];
  const loc = (lat, lng, extra = {}) => ({ event: 'ambulance.location', payload: { lat, lng }, ...extra });
  assert.equal(classifyLocationEvent(loc(1, 1, { local: true }), posts, now), 'local');
  assert.equal(classifyLocationEvent(loc(23.0301, 72.5801), posts, now), 'echo');
  assert.equal(classifyLocationEvent(loc(23.0301 + 0.00001, 72.5801), posts, now), 'echo'); // rounded by the backend
  assert.equal(classifyLocationEvent(loc(23.05, 72.6), posts, now), 'backend');
  assert.equal(classifyLocationEvent(loc(23.0301, 72.5801), [{ ...posts[0], at: now - 20_000 }], now), 'backend'); // old post, not an echo
  assert.equal(classifyLocationEvent({ event: 'ambulance.location', payload: { actor: 'Ambulance' } }, posts, now), 'ignore'); // no coordinates
  assert.equal(classifyLocationEvent(loc(null, null), posts, now), 'ignore');
});
