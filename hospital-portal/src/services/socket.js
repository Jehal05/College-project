// WebSocket client. Every event follows the contract:
// { event, emergency_id, state, timestamp, payload }
// In mock mode no connection is opened; services/mockBackend.js calls emitMock() instead.
import { USE_MOCK, WS_URL, WS_AUTH } from './config.js';
import { WS_EVENTS, PROPOSED_EVENTS } from './contract.js';
import { normaliseEvent } from './adapters.js';
import { createLink } from './socketLink.js';

const handlers = new Map(); // event name -> Set of callbacks

// ---- connection status: 'mock' | 'connecting' | 'live' | 'reconnecting' | 'signed_out'
let status = USE_MOCK ? 'mock' : 'connecting';
const statusListeners = new Set();
function setStatus(next) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((cb) => cb(status));
}
export const getStatus = () => status;
export function onStatus(callback) {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
}

function deliver(raw) {
  const message = normaliseEvent(raw); // one adapter for every shape (services/adapters.js)
  if (!message) return;
  message.received_at = Date.now(); // local clock: flashing and timing never depend on the backend's clock
  if (raw.local) message.local = true;
  handlers.get(message.event)?.forEach((cb) => cb(message));
  handlers.get('*')?.forEach((cb) => cb(message));
}

let token = null;
const link = createLink({
  makeSocket: () => {
    // VITE_WS_AUTH=query (default): token in the address. =message: the token is sent as the first message instead.
    const url = token && WS_AUTH === 'query' ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
    return new WebSocket(url);
  },
  onOpen: (socket) => {
    if (token && WS_AUTH === 'message') socket.send(JSON.stringify({ type: 'auth', token }));
  },
  onMessage: (e) => {
    try {
      deliver(JSON.parse(e.data));
    } catch (err) {
      console.warn('Bad WebSocket message', err);
    }
  },
  onStatus: setStatus,
});

/**
 * Open the connection (call after login). If it drops, it tries again after 2 s, 4 s, 8 s ... up to 30 s (with a little jitter).
 * If the server closes it with code 1008 (the login is no longer valid) it stops and the status becomes 'signed_out'.
 */
export function connect(authToken) {
  if (USE_MOCK) return setStatus('mock');
  token = authToken;
  if (status === 'signed_out') setStatus('connecting');
  link.start();
}

/** Close the connection (call on logout). */
export function disconnect() {
  token = null;
  link.stop(USE_MOCK ? 'mock' : 'connecting');
}

/**
 * Listen for an event ('emergency.created', ... or '*' for all).
 * Returns an unsubscribe function, so it can be returned straight from useEffect.
 */
export function subscribe(event, callback) {
  if (event !== '*' && !WS_EVENTS.includes(event) && !PROPOSED_EVENTS.includes(event)) {
    console.warn(`Unknown event "${event}". Check the team contract.`);
  }
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(callback);
  return () => unsubscribe(event, callback);
}

export function unsubscribe(event, callback) {
  handlers.get(event)?.delete(callback);
}

/** Fake an incoming event (mock mode and local testing). */
export function emitMock(event, { emergency_id, state, timestamp, payload = {} }) {
  deliver({ event, emergency_id, state, timestamp: timestamp || new Date().toISOString(), payload, local: true });
}
