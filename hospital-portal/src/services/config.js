// Settings read from .env (see .env.example). Restart `npm run dev` after changing them.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Who moves the ambulance: auto | true | false (see services/movement.js and README).
export const PORTAL_SIMULATES_AMBULANCE = import.meta.env.VITE_PORTAL_SIMULATES_AMBULANCE || 'auto';
// How the WebSocket proves who you are: query = ?token= in the address (default), message = first message { type: 'auth', token }.
export const WS_AUTH = import.meta.env.VITE_WS_AUTH === 'message' ? 'message' : 'query';
// Optional number: with it, the mock's random alerts repeat in the same order every run (a steady demo). Empty = random.
export const MOCK_SEED = import.meta.env.VITE_MOCK_SEED || '';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
