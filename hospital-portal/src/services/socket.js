// WebSocket client (stub for Phase 1; used live from Phase 2).
// Every event follows the contract: { event, emergency_id, state, timestamp, payload }.
import { USE_MOCK } from './api.js';
import { WS_EVENTS } from './contract.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

let ws = null;
let reconnectTimer = null;
const handlers = new Map(); // event name -> Set of callbacks

function dispatchEvent(message) {
  const { event } = message;
  handlers.get(event)?.forEach((cb) => cb(message));
  handlers.get('*')?.forEach((cb) => cb(message));
}

/** Open the connection. In mock mode nothing is opened; use emitMock() to fake events. */
export function connect(token) {
  if (USE_MOCK || ws) return;
  const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
  ws = new WebSocket(url);

  ws.onmessage = (e) => {
    try {
      dispatchEvent(JSON.parse(e.data));
    } catch (err) {
      console.warn('Bad WebSocket message', err);
    }
  };
  ws.onclose = () => {
    ws = null;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(token), 2000); // auto-reconnect
  };
}

export function disconnect() {
  clearTimeout(reconnectTimer);
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}

/**
 * Listen for an event ('emergency.created', ... or '*' for all).
 * Returns an unsubscribe function, so it can be returned straight from useEffect.
 */
export function subscribe(event, callback) {
  if (event !== '*' && !WS_EVENTS.includes(event)) {
    console.warn(`Unknown event "${event}". Check the team contract.`);
  }
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(callback);
  return () => unsubscribe(event, callback);
}

export function unsubscribe(event, callback) {
  handlers.get(event)?.delete(callback);
}

/** Fake an incoming event for local testing (mock mode). */
export function emitMock(event, { emergency_id, state, payload = {} }) {
  dispatchEvent({ event, emergency_id, state, timestamp: new Date().toISOString(), payload });
}
