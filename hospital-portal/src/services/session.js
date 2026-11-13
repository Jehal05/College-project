// Where the login session is kept in the browser. Used by auth.js and api.js.
const STORAGE_KEY = 'ht_hospital_session';

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
export const getToken = () => getSession()?.token || null;
