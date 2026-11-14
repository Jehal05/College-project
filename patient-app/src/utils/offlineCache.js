// "Saved copies" of the last successful GET answers, so a few screens can still be READ offline.
// Kept in memory and mirrored in sessionStorage (this tab only). Cleared on sign out.
// Never uses localStorage or IndexedDB, and never stores report files (only the list).
const PREFIX = 'ht.cache.';
const memory = new Map();
const CACHEABLE = [/^\/patients\/[^/]+$/, /^\/patients\/[^/]+\/(contacts|consents|reports|baseline)$/];

export const isCacheable = (path) => CACHEABLE.some((rule) => rule.test(path));

export function saveCopy(path, data) {
  if (!isCacheable(path)) return;
  memory.set(path, data);
  try { sessionStorage.setItem(PREFIX + path, JSON.stringify(data)); } catch { /* storage blocked */ }
}

// Returns the saved copy, or undefined when there is none.
export function readCopy(path) {
  if (memory.has(path)) return memory.get(path);
  try {
    const text = sessionStorage.getItem(PREFIX + path);
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

// Forget every saved copy and any unsent emergency (used by sign out).
export function clearCopies() {
  memory.clear();
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(PREFIX) || key === 'ht.pending')
      .forEach((key) => sessionStorage.removeItem(key));
  } catch { /* storage blocked */ }
}
