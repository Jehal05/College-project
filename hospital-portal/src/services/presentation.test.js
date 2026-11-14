import test from 'node:test';
import assert from 'node:assert/strict';
import { isPresenting, setPresenting, subscribePresenting } from './presentation.js';

test('presentation mode starts off, can be switched, and tells its listeners once per change', () => {
  const seen = [];
  const off = subscribePresenting(() => seen.push(isPresenting()));
  assert.equal(isPresenting(), false);
  setPresenting(true);
  setPresenting(true); // no change, no event
  assert.equal(isPresenting(), true);
  setPresenting(false);
  off();
  setPresenting(true);
  assert.deepEqual(seen, [true, false]);
  setPresenting(false);
});
