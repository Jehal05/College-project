// Pure timing for the "connection lost" banner. No clock, no browser: the caller passes `now` (ms).
export const LOST_AFTER_MS = 10000; // show the banner only after 10 seconds without a connection
export const BACK_FOR_MS = 5000; // keep the "Reconnected" message for 5 seconds

const two = (n) => String(n).padStart(2, '0');
/** HH:MM:SS in local time. */
export function clockText(ms) {
  const d = new Date(ms);
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

/**
 * @param {{ lostAt: number|null, backAt: number|null, reloaded: number|null, now: number }} s
 *   lostAt   when the connection was first lost (ms), or null
 *   backAt   when it came back (ms), or null
 *   reloaded how many alerts the reload after reconnecting found, or null while still loading
 * @returns {{ kind: 'none'|'lost'|'back', text: string }}
 */
export function bannerView({ lostAt, backAt, reloaded, now }) {
  const none = { kind: 'none', text: '' };
  if (!Number.isFinite(lostAt)) return none;
  if (!Number.isFinite(backAt)) {
    return now - lostAt >= LOST_AFTER_MS
      ? { kind: 'lost', text: `Connection lost at ${clockText(lostAt)}. New alerts may be missing.` }
      : none;
  }
  if (backAt - lostAt < LOST_AFTER_MS) return none; // it was short, the banner never showed
  if (now - backAt >= BACK_FOR_MS) return none;
  if (!Number.isFinite(reloaded)) return { kind: 'back', text: 'Reconnected. Reloading alerts…' };
  return { kind: 'back', text: `Reconnected. Reloaded ${reloaded} ${reloaded === 1 ? 'alert' : 'alerts'}.` };
}

/** Milliseconds until the view could next change (for the timer), or null when nothing is pending. */
export function nextChangeIn({ lostAt, backAt, now }) {
  if (!Number.isFinite(lostAt)) return null;
  if (!Number.isFinite(backAt)) return Math.max(0, lostAt + LOST_AFTER_MS - now) || 1000;
  const left = backAt + BACK_FOR_MS - now;
  return left > 0 ? left : null;
}
