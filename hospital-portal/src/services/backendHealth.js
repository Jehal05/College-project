// "Is the backend there?" (real mode only). A small check every 15 seconds: any HTTP answer, even a 404, means
// the server is reachable. Only a network failure or no answer within 5 seconds counts as a miss.
// Two misses in a row make the banner appear; one good answer clears it. Pure step + a tiny store.
export const CHECK_EVERY_MS = 15000;
export const MISSES_FOR_DOWN = 2;

/** @param {{ misses: number, down: boolean }} state  @param {boolean} reachable  @returns the next state */
export function healthStep(state, reachable) {
  if (reachable) return { misses: 0, down: false };
  const misses = (state?.misses || 0) + 1;
  return { misses, down: misses >= MISSES_FOR_DOWN };
}

let current = { misses: 0, down: false };
const listeners = new Set();
export const isBackendDown = () => current.down;
export function recordCheck(reachable) {
  const next = healthStep(current, reachable);
  const changed = next.down !== current.down;
  current = next;
  if (changed) listeners.forEach((cb) => cb(current.down));
}
export function resetHealth() {
  const was = current.down;
  current = { misses: 0, down: false };
  if (was) listeners.forEach((cb) => cb(false));
}
export function onBackendDown(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
