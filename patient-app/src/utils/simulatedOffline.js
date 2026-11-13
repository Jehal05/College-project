// Demo-only switch: makes the app behave as if there were no data connection, WITHOUT touching the browser's real network.
// Kept in memory only (a reload clears it). Only the demo panel (/demo, demo builds) can turn it on.
let on = false;
const listeners = new Set();

export const isSimulatedOffline = () => on;
export function setSimulatedOffline(value) {
  if (value === on) return;
  on = value;
  listeners.forEach((fn) => fn());
  if (!on) window.dispatchEvent(new Event('online')); // lets useOnline check /health again
}
export function onSimulatedOffline(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
