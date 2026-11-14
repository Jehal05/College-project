// Where the login session is kept in the browser. Used by auth.js and api.js.
// It lives in sessionStorage: it is cleared when the tab is closed, so a token is not left behind on a shared computer.
// This is the ONLY file that touches the session storage. (Known limitation: see README.)
const STORAGE_KEY = 'ht_hospital_session';

export function getSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function saveSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}
export const getToken = () => getSession()?.token || null;
