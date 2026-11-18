// EVERY address of an outside service this portal can call, in one place. Change them here (or with the VITE_ settings in .env).
// Only coordinates are ever sent to these services: never a name, an id or any health data.
// Both defaults are free, keyless public servers. Their rules: https://operations.osmfoundation.org/policies/tiles/ (light, demo-sized use,
// keep the credit line on the map) and https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server (a demo server, not for heavy use).
const env = (name, fallback) => (import.meta.env && import.meta.env[name]) || fallback;

export const TILE_URL = env('VITE_TILE_URL', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const ROUTING_URL = env('VITE_ROUTING_URL', 'https://router.project-osrm.org');
export const ROUTING_TIMEOUT_MS = 4000; // after this the straight-line estimate is used instead
// Set VITE_ROAD_ROUTES=false to never call the routing server (tests and offline demos): routes stay simulated straight-ish lines.
export const ROAD_ROUTES = env('VITE_ROAD_ROUTES', 'true') !== 'false';
