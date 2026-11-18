// Map tile health and trip distance (Phase 6A step 5). Pure: no React, no Leaflet. Tests: mapHealth.test.js.

export const TILE_FAIL_AFTER = 3;
export const START_TILES = { loaded: 0, failed: 0 };

/** Count a tile result. event: 'load' | 'error'. */
export function nextTiles(state, event) {
  if (event === 'load') return { ...state, loaded: state.loaded + 1 };
  if (event === 'error') return { ...state, failed: state.failed + 1 };
  return state;
}

/** The base map is "down" when several tiles failed and failures outnumber successes. Markers and routes still work. */
export const tilesDown = (state) => state.failed >= TILE_FAIL_AFTER && state.failed > state.loaded;

/**
 * Kilometres still to drive on the simulated route. Needs a real position (live) and a route length;
 * otherwise null, and the screen leaves it out. Arrived = 0.
 */
export function remainingKm({ totalKm, progress, live, arrived }) {
  if (arrived) return 0;
  if (!live || !Number.isFinite(totalKm) || totalKm < 0 || !Number.isFinite(progress)) return null;
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(totalKm * (1 - p) * 10) / 10;
}
