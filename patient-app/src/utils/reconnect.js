// Timing rules for the live-events socket. Pure, so it can be tested without a browser.
export const BASE_MS = 2000;
export const MAX_MS = 30000;
export const STABLE_MS = 10000; // a socket must stay open this long before the wait starts again from 2 s
const DEAD_LOGIN = 1008; // the server's "this login is no longer valid"

/** 2 s, 4 s, 8 s ... up to 30 s. @param {number} attempt 0 for the first retry */
export function retryDelay(attempt) {
  const n = Math.max(0, Math.floor(Number(attempt) || 0));
  return Math.min(MAX_MS, BASE_MS * 2 ** Math.min(n, 10));
}

export const isDeadLogin = (code) => code === DEAD_LOGIN;
