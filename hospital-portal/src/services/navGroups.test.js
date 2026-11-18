import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_GROUPS, visibleGroups } from './navGroups.js';

const routes = (groups) => groups.flatMap((g) => g.links.map((l) => l.to));

test('every route the portal had before is still in the menu, once', () => {
  const all = routes(NAV_GROUPS);
  assert.deepEqual([...all].sort(), ['/activity', '/admin', '/analytics', '/dashboard', '/fleet', '/handover', '/history', '/map', '/passport']);
  assert.equal(new Set(all).size, all.length);
});
test('staff do not see Admin or an empty Administration group; admin does', () => {
  const staff = visibleGroups('staff');
  assert.equal(routes(staff).includes('/admin'), false);
  assert.equal(staff.some((g) => g.id === 'admin'), false);
  assert.equal(routes(visibleGroups('admin')).includes('/admin'), true);
});
test('four groups in the agreed order for an admin', () => {
  assert.deepEqual(visibleGroups('admin').map((g) => g.id), ['ops', 'mgmt', 'insights', 'admin']);
});
