// Theme choice (dark is the main look). Only the word "dark" or "light" is stored on this device, never health data.
export const THEMES = ['dark', 'light'];
const KEY = 'ht.theme';
const listeners = new Set();

export function getTheme() {
  try { const v = localStorage.getItem(KEY); return THEMES.includes(v) ? v : 'dark'; } catch { return 'dark'; }
}
export function applyTheme(theme, doc = typeof document !== 'undefined' ? document : null) {
  const el = doc && doc.documentElement;
  if (!el) return;
  const value = THEMES.includes(theme) ? theme : 'dark';
  if (typeof el.setAttribute === 'function') { el.setAttribute('data-theme', value); return; } // real pages
  el.dataset = el.dataset || {}; // simple stand-ins (tests) have no setAttribute
  el.dataset.theme = value;
}
export function setTheme(theme) {
  const next = THEMES.includes(theme) ? theme : 'dark';
  try { localStorage.setItem(KEY, next); } catch { /* private mode: the choice just lasts until reload */ }
  applyTheme(next);
  listeners.forEach((l) => l());
}
export const subscribeTheme = (l) => { listeners.add(l); return () => listeners.delete(l); };
