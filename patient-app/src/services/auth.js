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
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore storage errors */
  }
  notify();
}

export const getSession = () => session;
export const getToken = () => (session ? session.token : null);
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

loadSession();
