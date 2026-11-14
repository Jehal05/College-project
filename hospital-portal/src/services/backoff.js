// Pure timing for socket reconnects: 2 s, 4 s, 8 s ... up to 30 s, with a small random jitter
// so that many desks do not all knock on the server at the same moment.
export const BASE_MS = 2000;
export const MAX_MS = 30000;
export const JITTER = 0.2; // the delay is changed by up to +-10 %

/** @param {number} attempt 0 for the first retry  @param {() => number} [random] 0..1, for tests */
export function reconnectDelay(attempt, random = Math.random) {
  const n = Math.max(0, Math.floor(Number(attempt) || 0));
  const plain = Math.min(MAX_MS, BASE_MS * 2 ** Math.min(n, 10));
  const jittered = plain * (1 - JITTER / 2 + JITTER * random());
  return Math.round(Math.min(MAX_MS, jittered));
}
