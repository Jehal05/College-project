import { clearCopies } from '../utils/offlineCache';
import { clearNotifications } from '../utils/notifications';

// Login session. The token lives in memory and is copied to sessionStorage
// so a page reload keeps you signed in (closing the tab signs you out).
let session = null; // { token, role, patient_id }
const listeners = new Set();
const KEY = 'healthtwin_session';

function notify() {
  listeners.forEach((fn) => fn());
}

// Called once when the app starts: restore a saved session if there is one.
export function loadSession() {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) session = JSON.parse(saved);
  } catch {
    session = null; // Storage may be blocked; the app still works.
  }
}

export function setSession(newSession) {
  session = newSession;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(newSession));
  } catch {
    /* ignore storage errors */
  }
  notify();
}

export function clearSession() {
  session = null;
  clearCopies(); // saved copies and unsent emergencies must not outlive the login
  clearNotifications();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore storage errors */
  }
  notify();
}

// When the server says the login is no longer valid we sign out and leave a note for the Login screen.
let notice = null;
export function expireSession() {
  if (!session) return;
  // Never pull the person away from the emergency screens: the call button and the emergency flow stay usable.
  if (/^\/(symptoms|emergency)/.test(window.location.pathname)) return;
  notice = 'expired';
  clearSession();
}
export const takeNotice = () => { const n = notice; notice = null; return n; };
if (typeof window !== 'undefined') window.addEventListener('ht:unauthorized', expireSession);

export const getSession = () => session;
export const getToken = () => (session ? session.token : null);
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

loadSession();
