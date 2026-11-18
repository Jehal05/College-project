import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_GROUPS, visibleGroups } from './navGroups.js';

const routes = (groups) => groups.flatMap((g) => g.links.map((l) => l.to));

test('the menu has the five pages of the simple portal, once each', () => {
  const all = routes(NAV_GROUPS);
  assert.deepEqual([...all].sort(), ['/dashboard', '/fleet', '/history', '/map', '/passport']);
  assert.equal(new Set(all).size, all.length);
});
test('staff and admin see the same two groups in order', () => {
  assert.deepEqual(visibleGroups('staff').map((g) => g.id), ['ops', 'mgmt']);
  assert.deepEqual(visibleGroups('admin').map((g) => g.id), ['ops', 'mgmt']);
});
