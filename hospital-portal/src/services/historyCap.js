// The mock keeps finished cases in localStorage. That space is small and shared, so only the newest cases are kept.
export const MAX_SAVED = 200;

/** Keep the newest `max` cases (the list is oldest first, new cases are added at the end). */
export function capSaved(list, max = MAX_SAVED) {
  const items = Array.isArray(list) ? list : [];
  return items.length > max ? items.slice(items.length - max) : items;
}
