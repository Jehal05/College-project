// What the live card shows. Pure, so it is tested without a browser.
export const STALE_MS = 15000; // no update for this long: say so instead of showing an old number as current

/** { state: 'live' | 'quiet' | 'stopped', ageSeconds } */
export function liveState(live, now = Date.now()) {
  if (!live) return null;
  if (live.sharing === false) return { state: 'stopped', ageSeconds: null };
  const at = Date.parse(live.updated_at);
  const age = Number.isFinite(at) ? Math.max(0, Math.round((now - at) / 1000)) : null;
  return { state: age !== null && age * 1000 <= STALE_MS ? 'live' : 'quiet', ageSeconds: age };
}

/** The heart rate to show, or null when it is missing or older than STALE_MS (never an old number as live). */
export function liveHeartRate(live, now = Date.now()) {
  if (!live || !Number.isFinite(live.heart_rate)) return null;
  const at = Date.parse(live.hr_at || live.updated_at);
  if (live.sharing !== false && Number.isFinite(at) && now - at > STALE_MS) return null;
  return live.heart_rate;
}

export const hasPosition = (live) => Boolean(live) && Number.isFinite(live.lat) && Number.isFinite(live.lng);
