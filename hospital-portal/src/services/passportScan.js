// Helpers for the staff QR passport page. Pure functions, so they can be tested without a browser.
export const PURPOSES = ['emergency_treatment', 'admission_check', 'ambulance_handover', 'follow_up'];
const TOKEN = /^[A-Za-z0-9_-]{22,64}$/;

/** Pulls the token out of a pasted QR link (".../p/<token>") or a bare token. Returns null when it does not look like one. */
export function parseToken(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  const m = /\/p\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/.exec(s);
  const candidate = m ? m[1] : s;
  return TOKEN.test(candidate) ? candidate : null;
}

/** Maps an API failure to a translation key; never shows server text for a bad link. */
export function scanErrorKey(err) {
  const status = err && err.status;
  if (status === 410) return 'ps.unavailable';
  if (status === 403) return 'ps.denied';
  if (status === 400) return 'ps.needPurpose';
  if (status === 429) return 'ps.tooMany';
  if (status === 404) return 'ps.unavailable';
  return 'ps.error';
}

/** Text key for each purpose (written out so the translation check can see every key). */
export const PURPOSE_KEY = {
  emergency_treatment: 'ps.p.emergency_treatment', admission_check: 'ps.p.admission_check',
  ambulance_handover: 'ps.p.ambulance_handover', follow_up: 'ps.p.follow_up',
};
