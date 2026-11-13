// Live events from the server. Reconnects automatically if the connection drops.
import { API_URL } from './api';
import { normalizeEvent } from '../utils/adapters';

// By default the WebSocket address is built from VITE_API_URL (http -> ws), so ONE variable switches both.
export const WS_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws') + '/ws';

// Returns a function that stops listening. onStatus(true/false) reports connection state.
export function connectEvents(onEvent, onStatus) {
  let socket = null;
  let timer = null;
  let stopped = false;

  function open() {
    socket = new WebSocket(WS_URL);
    socket.onopen = () => onStatus(true);
    socket.onmessage = (msg) => {
      try {
        onEvent(normalizeEvent(JSON.parse(msg.data))); // Shape: { type, emergency_id, state, timestamp, payload } (Daksh's backend names the type `event`)
      } catch {
        /* ignore malformed messages */
      }
    };
    socket.onclose = () => {
      onStatus(false);
      if (!stopped) timer = setTimeout(open, 2000); // Try again in 2 seconds.
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
