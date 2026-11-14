// Is the app online? One shared answer for every screen.
// "Online" means the browser says so AND the server answers GET /health. A failed request elsewhere
// in the app (event "ht:network-fail") also flips it to offline; while offline we check /health every 5 s.
import { useSyncExternalStore } from 'react';
import { API_URL } from '../services/api';
import { isSimulatedOffline, onSimulatedOffline } from '../utils/simulatedOffline';

let online = typeof navigator === 'undefined' ? true : navigator.onLine;
let timer = null;
const listeners = new Set();

function setOnline(value) {
  if (value !== online) {
    online = value;
    listeners.forEach((fn) => fn());
  }
  if (online && timer) { clearInterval(timer); timer = null; }
  if (!online && !timer) timer = setInterval(ping, 5000);
}

// Quick health check with a 3 second limit.
async function ping() {
  const controller = new AbortController();
  const stop = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(API_URL + '/health', { signal: controller.signal, cache: 'no-store' });
    setOnline(response.ok);
  } catch {
    setOnline(false);
  } finally {
    clearTimeout(stop);
  }
}

window.addEventListener('offline', () => setOnline(false));
window.addEventListener('online', ping);
window.addEventListener('ht:network-fail', () => setOnline(false));
if (!online) setOnline(false); // starts the 5 second check

// The demo panel can also switch "no data connection" on (utils/simulatedOffline.js), so the SMS fallback can be rehearsed.
const subscribe = (fn) => {
  listeners.add(fn);
  const stopSimulated = onSimulatedOffline(fn);
  return () => { listeners.delete(fn); stopSimulated(); };
};
export default function useOnline() {
  return useSyncExternalStore(subscribe, () => online && !isSimulatedOffline());
}
