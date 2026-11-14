// When the backend says 401, the login is no longer valid. This module clears the session once,
// tells the app (AuthProvider listens) and leaves a one-time note for the login screen.
// It stores no token. Tests: sessionExpiry.test.js (storage is passed in, so no browser is needed).
import { clearSession, getToken } from './session.js';

const FLAG = 'ht_session_expired';
const listeners = new Set();

export const onSessionExpired = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Call on a 401. Does nothing when nobody is logged in (so a burst of failing calls fires once). */
export function markExpired(hasToken = getToken, clear = clearSession, store = safeStore()) {
  if (!hasToken()) return false;
  clear();
  try {
    store?.setItem(FLAG, '1');
  } catch {
    /* storage blocked: the redirect still happens, only the note is lost */
  }
  listeners.forEach((cb) => cb());
  return true;
}

/** Read and remove the one-time "session expired" note. */
export function takeExpiredNotice(store = safeStore()) {
  try {
    const on = store?.getItem(FLAG) === '1';
    if (on) store.removeItem(FLAG);
    return on;
  } catch {
    return false;
  }
}

function safeStore() {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}
