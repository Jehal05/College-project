// Is the app online? One shared answer for every screen.
// "Online" means the browser says so AND the server answers GET /health. A failed request elsewhere
// in the app (event "ht:network-fail") also flips it to offline; while offline we check /health every 5 s.
import { useSyncExternalStore } from 'react';
import { API_URL } from '../services/api';

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

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export default function useOnline() {
  return useSyncExternalStore(subscribe, () => online);
}
