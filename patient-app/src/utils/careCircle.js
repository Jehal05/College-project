// Small helpers for the Care Circle screen. The circle is simply the person's emergency contacts.
export const SHARE_KEYS = ['location', 'history', 'vitals', 'reports'];

// Primary contact first, then by name. Does not change the list it is given.
export const orderMembers = (contacts) =>
  [...(contacts || [])].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || String(a.name).localeCompare(String(b.name)));

// What circle members could see: only what the person allows. An unknown or missing consent counts as "not shared" here
// (the screen must never promise more sharing than exists).
export const sharedKeys = (consents) => SHARE_KEYS.filter((k) => consents && consents[k] === true);
export const hiddenKeys = (consents) => SHARE_KEYS.filter((k) => !consents || consents[k] !== true);

// Latest looks by family members (relatives), newest first.
export const familyActivity = (entries, limit = 5) =>
  (entries || []).filter((e) => e.who && e.who.kind === 'relative').slice(0, limit);

// A circle with nobody in it cannot be told about an alert.
export const circleReady = (contacts) => (contacts || []).length > 0;
