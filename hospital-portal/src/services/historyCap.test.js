import test from 'node:test';
import assert from 'node:assert/strict';
import { capSaved, MAX_SAVED } from './historyCap.js';
import { makeRandom } from './seededRandom.js';

test('the cap is about 200 and keeps the newest cases', () => {
  assert.equal(MAX_SAVED, 200);
  const list = Array.from({ length: 250 }, (_, i) => ({ id: i }));
  const kept = capSaved(list);
  assert.equal(kept.length, 200);
  assert.equal(kept[0].id, 50);
  assert.equal(kept.at(-1).id, 249);
  assert.equal(capSaved(list.slice(0, 5)).length, 5);
  assert.deepEqual(capSaved(null), []);
  assert.equal(capSaved(list, 3).length, 3);
});

test('the same seed gives the same numbers; another seed differs; no seed is Math.random', () => {
  const a = makeRandom('42');
  const b = makeRandom(42);
  const seq = (r) => [r(), r(), r(), r()];
  assert.deepEqual(seq(a), seq(b));
  assert.notDeepEqual(seq(makeRandom(1)), seq(makeRandom(2)));
  for (const x of seq(makeRandom(7))) assert.ok(x >= 0 && x < 1);
  for (const none of [undefined, '', 'abc']) assert.equal(makeRandom(none), Math.random);
});
