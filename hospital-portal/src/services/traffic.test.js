import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { levelForHour, resolveLevel, trafficFactor, totalFactor } from './traffic.js';

const config = JSON.parse(fs.readFileSync(new URL('../data/traffic-config.json', import.meta.url)));
const at = (hour) => new Date(2026, 10, 13, hour, 30);

test('time of day picks the traffic level', () => {
  assert.equal(levelForHour(config, 3), 'light');
  assert.equal(levelForHour(config, 9), 'heavy');
  assert.equal(levelForHour(config, 14), 'moderate');
  assert.equal(levelForHour(config, 18), 'heavy');
  assert.equal(levelForHour(config, 23), 'light');
});

test('every hour of the day has a level', () => {
  for (let h = 0; h < 24; h++) assert.ok(config.levels[levelForHour(config, h)], `hour ${h}`);
});

test('auto follows the clock; a manual choice overrides it', () => {
  assert.equal(resolveLevel(config, 'auto', at(9)), 'heavy');
  assert.equal(resolveLevel(config, 'light', at(9)), 'light');
  assert.equal(resolveLevel(config, 'nonsense', at(14)), 'moderate');
});

test('factors: light 1.0, moderate 1.3, heavy 1.7', () => {
  assert.equal(trafficFactor(config, 'light'), 1.0);
  assert.equal(trafficFactor(config, 'moderate'), 1.3);
  assert.equal(trafficFactor(config, 'heavy'), 1.7);
});

test('a logged corridor request shortens the trip by the configured amount', () => {
  assert.equal(totalFactor(config, 'heavy', false), 1.7);
  assert.ok(Math.abs(totalFactor(config, 'heavy', true) - 1.7 * 0.85) < 1e-9);
  assert.ok(totalFactor(config, 'light', true) < 1);
});
