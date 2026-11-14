import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nearestAeds, respondersNear, withDistanceFrom } from './nearby.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../data/${n}`, import.meta.url)));
const P = { lat: 23.0225, lng: 72.5714 };

test('nearest AED comes first, with a distance and a simulated walking time', () => {
  const aeds = [{ id: 'far', lat: 23.1, lng: 72.6 }, { id: 'near', lat: 23.0235, lng: 72.5714 }, { id: 'mid', lat: 23.04, lng: 72.57 }];
  const out = nearestAeds(aeds, P, 2);
  assert.deepEqual(out.map((a) => a.id), ['near', 'mid']);
  assert.ok(out[0].distance_km < 0.2 && out[0].walk_min >= 1);
});

test('known distance: 0.01 degrees of latitude is about 1.1 km', () => {
  const [a] = withDistanceFrom([{ id: 'x', lat: 23.0325, lng: 72.5714 }], P);
  assert.equal(a.distance_km, 1.1);
});

test('missing patient location or bad places give an empty list, not a crash', () => {
  assert.deepEqual(nearestAeds([{ id: 'a', lat: 1, lng: 1 }], null), []);
  assert.deepEqual(nearestAeds([{ id: 'bad' }, null].filter(Boolean), P), []);
  assert.deepEqual(nearestAeds(undefined, P), []);
});

test('responders: only those inside the radius and available', () => {
  const people = [{ id: 'r1', lat: 23.0235, lng: 72.5714 }, { id: 'r2', lat: 23.2, lng: 72.57 }, { id: 'r3', lat: 23.0226, lng: 72.5715, available: false }];
  assert.deepEqual(respondersNear(people, P).map((r) => r.id), ['r1']);
  assert.deepEqual(respondersNear(people, P, 50).map((r) => r.id), ['r1', 'r2']);
});

test('sample data files are valid and labelled', () => {
  const aeds = load('aed.json');
  const responders = load('responders.json');
  assert.ok(aeds.length >= 5 && responders.length >= 5);
  for (const p of [...aeds, ...responders]) assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.id && p.name, p.id);
  assert.ok(nearestAeds(aeds, P, 1)[0].distance_km < 3);
  assert.ok(respondersNear(responders, P).length >= 2);
});
