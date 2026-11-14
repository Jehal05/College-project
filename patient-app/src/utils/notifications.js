// In-session notification list (memory only; gone when the tab closes or on sign out).
// Items hold only a translation key and a time, never medical detail.
let items = []; // newest first: { id, key, at, read }
let counter = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getItems = () => items;
export function addNotification(key) {
  counter += 1;
  items = [{ id: counter, key, at: new Date().toISOString(), read: false }, ...items].slice(0, 20);
  emit();
}
export function markAllRead() {
  if (items.every((i) => i.read)) return;
  items = items.map((i) => ({ ...i, read: true }));
  emit();
}
export function clearNotifications() { items = []; emit(); }
