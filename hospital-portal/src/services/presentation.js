// Presentation mode (for the jury): bigger text, the mock helper buttons hidden and the language fixed.
// Saved in localStorage, so a page refresh keeps it. Same pattern as the language store.
const KEY = 'ht_presentation';
const listeners = new Set();
let on = null;

function read() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false; // storage blocked: normal mode
  }
}
function apply(value) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('presentation', value);
}
export const isPresenting = () => {
  if (on === null) {
    on = read();
    apply(on);
  }
  return on;
};
export const subscribePresenting = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export function setPresenting(next) {
  const value = Boolean(next);
  if (value === isPresenting()) return;
  on = value;
  try {
    if (value) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    /* not saved, still applied */
  }
  apply(value);
  listeners.forEach((cb) => cb());
}
