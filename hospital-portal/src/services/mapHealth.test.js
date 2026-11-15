import test from 'node:test';
import assert from 'node:assert/strict';
import { START_TILES, nextTiles, tilesDown, remainingKm } from './mapHealth.js';

const run = (...events) => events.reduce(nextTiles, START_TILES);

test('a few failed tiles are not an outage; three failures with no loads are', () => {
  assert.equal(tilesDown(run('error', 'error')), false);
  assert.equal(tilesDown(run('error', 'error', 'error')), true);
});
test('failures that are outnumbered by loaded tiles do not raise the notice', () => {
  assert.equal(tilesDown(run('load', 'load', 'load', 'load', 'error', 'error', 'error')), false);
  assert.equal(tilesDown(run('load', 'error', 'error', 'error')), true);
});
test('an unknown event changes nothing', () => assert.equal(nextTiles(START_TILES, 'x'), START_TILES));

test('remaining distance: from route length and progress, rounded to 0.1 km', () => {
  assert.equal(remainingKm({ totalKm: 10, progress: 0.25, live: true }), 7.5);
  assert.equal(remainingKm({ totalKm: 10, progress: 2, live: true }), 0);
  assert.equal(remainingKm({ totalKm: 10, progress: -1, live: true }), 10);
});
test('remaining distance: arrived is 0; no live position or bad numbers give null (never a guess)', () => {
  assert.equal(remainingKm({ totalKm: 10, progress: 0, live: false, arrived: true }), 0);
  assert.equal(remainingKm({ totalKm: 10, progress: 0.5, live: false }), null);
  assert.equal(remainingKm({ totalKm: NaN, progress: 0.5, live: true }), null);
  assert.equal(remainingKm({ totalKm: 10, progress: undefined, live: true }), null);
});
