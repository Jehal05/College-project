// The outside-service addresses live in ONE file. This test fails if a map file brings its own tile address back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TILE_URL, ROUTING_URL, ROUTING_TIMEOUT_MS } from './external.js';

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

test('defaults are public https servers and the routing wait is short', () => {
  assert.match(TILE_URL, /^https:\/\/.*\{z\}\/\{x\}\/\{y\}/);
  assert.match(ROUTING_URL, /^https:\/\//);
  assert.ok(ROUTING_TIMEOUT_MS > 0 && ROUTING_TIMEOUT_MS <= 5000);
});

test('no other source file has its own tile or routing address', () => {
  const here = join(import.meta.dirname, '..');
  const offenders = walk(here).filter((f) => /\.(js|jsx)$/.test(f) && !f.endsWith('external.js') && !f.endsWith('.test.js'))
    .filter((f) => /tile\.openstreetmap\.org|router\.project-osrm\.org/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
});
