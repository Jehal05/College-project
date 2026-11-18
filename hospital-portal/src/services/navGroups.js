// The portal's menu, grouped (Phase 6A step 6). Pure: tests in navGroups.test.js.
// Every route that existed before is still here; only the grouping is new.
export const NAV_GROUPS = [
  { id: 'ops', label: 'nav.g.ops', links: [
    { to: '/dashboard', label: 'nav.dashboard' },
    { to: '/map', label: 'nav.map' },
    { to: '/fleet', label: 'nav.fleet' },
  ] },
  { id: 'mgmt', label: 'nav.g.mgmt', links: [
    { to: '/history', label: 'nav.history' },
    { to: '/passport', label: 'nav.passport' },
  ] },
];

/** The groups this role may see. A group with no visible link is dropped (so staff never see an empty "Administration"). */
export function visibleGroups(role, groups = NAV_GROUPS) {
  return groups
    .map((g) => ({ ...g, links: g.links.filter((l) => !l.adminOnly || role === 'admin') }))
    .filter((g) => g.links.length > 0);
}
