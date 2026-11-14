// Who moves the ambulance on the map: the portal's own simulated trip or the backend's ambulance.location events?
// Setting VITE_PORTAL_SIMULATES_AMBULANCE = auto | true | false. Pure functions (tests: movement.test.js).

export const MODES = ['auto', 'true', 'false'];
export const BACKEND_WAIT_MS = 3000; // auto, real mode: how long to wait for a backend event before the portal moves the ambulance itself
const ECHO_WINDOW_MS = 8000;
const EPS = 2e-5; // about 2 m: the backend may round the position it echoes back

export const parseMode = (raw) => (MODES.includes(String(raw)) ? String(raw) : 'auto');

/**
 * What to do right after a dispatch.
 *   'start'  start the portal trip now
 *   'wait'   real mode, auto: wait BACKEND_WAIT_MS, then call again with elapsedMs
 *   'skip'   do not start a portal trip (the backend moves the ambulance)
 */
export function decideTrip({ mode, useMock, backendSeen = false, elapsedMs = 0 }) {
  if (mode === 'true') return 'start';
  if (mode === 'false') return 'skip';
  if (useMock) return 'start';
  if (backendSeen) return 'skip';
  return elapsedMs >= BACKEND_WAIT_MS ? 'start' : 'wait';
}

/** Who moves the ambulance, for the one-line note on screen. */
export function movementSource({ mode, useMock, portalTripRunning, backendSeen }) {
  if (mode === 'true' || (mode === 'auto' && useMock)) return 'portal';
  if (mode === 'false') return 'backend';
  if (backendSeen) return 'backend';
  return portalTripRunning ? 'portal' : 'auto';
}

const MOVEMENT_ENGLISH = {
  portal: 'Ambulance movement: simulated by the portal',
  backend: 'Ambulance movement: simulated by the backend',
  auto: 'Ambulance movement: the portal moves it unless the backend sends positions',
};
/** @param t optional translate function (from useT). Without it the text is English. */
export const movementText = (source, t) => {
  const key = source === 'portal' ? 'portal' : source === 'backend' ? 'backend' : 'auto';
  if (!t) return MOVEMENT_ENGLISH[key];
  const v = t(`mv.${key}`);
  return v === `mv.${key}` ? MOVEMENT_ENGLISH[key] : v;
};

/**
 * Is an incoming ambulance.location a real backend event?
 *   'local'    created on this screen (fallback when the backend has no location endpoint)
 *   'echo'     the backend broadcasting back the position the portal just posted
 *   'ignore'   no coordinates: not a position
 *   'backend'  anything else
 */
export function classifyLocationEvent(msg, recentPosts = [], nowMs = Date.now()) {
  if (msg?.local) return 'local';
  const p = msg?.payload || {};
  // A state change that only carries the name "ambulance.location" (no coordinates) is not movement.
  if (!Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng)) || p.lat === null || p.lng === null) return 'ignore';
  const echo = recentPosts.some((r) => nowMs - r.at <= ECHO_WINDOW_MS && Math.abs(r.lat - p.lat) < EPS && Math.abs(r.lng - p.lng) < EPS);
  return echo ? 'echo' : 'backend';
}
