// Live events from the server. Reconnects automatically if the connection drops.
import { API_URL } from './api';
import { normalizeEvent } from '../utils/adapters';
import { getToken } from './auth';
import { retryDelay, STABLE_MS, isDeadLogin } from '../utils/reconnect';

// By default the WebSocket address is built from VITE_API_URL (http -> ws), so ONE variable switches both.
export const WS_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws') + '/ws';

// Returns a function that stops listening. onStatus(true/false) reports connection state.
export function connectEvents(onEvent, onStatus) {
  let socket = null;
  let timer = null;
  let stopped = false;
  let attempt = 0; // failed tries in a row; starts again only after a socket stayed open for STABLE_MS
  let openedAt = null;

  function open() {
    const token = getToken(); // the server closes sockets that have no valid login token (code 1008)
    socket = new WebSocket(token ? WS_URL + (WS_URL.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token) : WS_URL);
    socket.onopen = () => {
      openedAt = Date.now();
      onStatus(true);
    };
    socket.onmessage = (msg) => {
      try {
        onEvent(normalizeEvent(JSON.parse(msg.data))); // Shape: { type, emergency_id, state, timestamp, payload } (Daksh's backend names the type `event`)
      } catch {
        /* ignore malformed messages */
      }
    };
    socket.onclose = (e) => {
      if (stopped) return; // a listener that was stopped (e.g. React re-mounting in development) must not report "offline" for the new one
      const stayed = openedAt === null ? 0 : Date.now() - openedAt;
      openedAt = null;
      onStatus(false);
      if (isDeadLogin(e && e.code)) return; // code 1008: the login is no longer valid, so trying again cannot help
      if (stayed >= STABLE_MS) attempt = 0;
      timer = setTimeout(open, retryDelay(attempt++)); // 2 s, 4 s, 8 s ... up to 30 s
    };
    socket.onerror = () => socket.close();
  }

  open();
  return () => {
    stopped = true;
    clearTimeout(timer);
    if (!socket) return;
    // Closing a socket that is still connecting makes the browser log a warning: wait until it is open, then close it.
    if (socket.readyState === WebSocket.CONNECTING) socket.onopen = () => socket.close();
    else socket.close();
  };
}
