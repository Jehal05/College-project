// WebSocket client. Every event follows the contract:
// { event, emergency_id, state, timestamp, payload }
// In mock mode no connection is opened; services/mockBackend.js calls emitMock() instead.
import { USE_MOCK, WS_URL, WS_AUTH } from './config.js';
import { WS_EVENTS, PROPOSED_EVENTS } from './contract.js';
import { normaliseEvent } from './adapters.js';
import { reconnectDelay } from './backoff.js';

let ws = null;
let reconnectTimer = null;
let wanted = false; // true between connect() and disconnect()
let attempt = 0; // failed tries in a row; the wait grows with it and starts again after a good connection
const handlers = new Map(); // event name -> Set of callbacks

// ---- connection status: 'mock' | 'connecting' | 'live' | 'reconnecting'
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

/** Open the connection (call after login). If it drops, it tries again after 2 s, 4 s, 8 s ... up to 30 s (with a little jitter). */
export function connect(token) {
  if (USE_MOCK) return setStatus('mock');
  wanted = true;
  if (ws) return;
  // VITE_WS_AUTH=query (default): token in the address. =message: the token is sent as the first message instead.
  const url = token && WS_AUTH === 'query' ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
  let socket;
  try {
    socket = new WebSocket(url);
  } catch (err) {
    console.warn('WebSocket could not start', err);
    return scheduleReconnect(token);
  }
  ws = socket;
  socket.onopen = () => {
    attempt = 0;
    if (token && WS_AUTH === 'message') socket.send(JSON.stringify({ type: 'auth', token }));
    setStatus('live');
  };
  socket.onmessage = (e) => {
    try {
      deliver(JSON.parse(e.data));
    } catch (err) {
      console.warn('Bad WebSocket message', err);
    }
  };
  // The browser gives no useful detail here, and the address holds the token, so nothing is logged from it.
  socket.onerror = () => {
    if (wanted && ws === socket) setStatus('reconnecting');
  };
  socket.onclose = () => {
    if (ws === socket) ws = null;
    if (wanted) scheduleReconnect(token);
  };
}

function scheduleReconnect(token) {
  setStatus('reconnecting');
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => wanted && connect(token), reconnectDelay(attempt++));
}

/** Close the connection (call on logout). */
export function disconnect() {
  wanted = false;
  attempt = 0;
  clearTimeout(reconnectTimer);
  if (ws) {
    const socket = ws;
    ws = null;
    socket.close();
  }
  setStatus(USE_MOCK ? 'mock' : 'connecting');
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
