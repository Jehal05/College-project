// Small shared UI state outside React (same idea as chatStore): the queue scope and the open alert.
// The scope is remembered for the browser tab (sessionStorage).
import { defaultScope, SCOPES } from './queueScope.js';
import { USE_MOCK } from './config.js';

const SCOPE_KEY = 'ht_queue_scope';
const listeners = new Set();
let selectedId = null;
let scope = null;

function readScope() {
  try {
    const v = sessionStorage.getItem(SCOPE_KEY);
    if (SCOPES.includes(v)) return v;
  } catch {
    /* storage blocked: use the default */
  }
  return defaultScope(USE_MOCK);
}

const emit = () => listeners.forEach((cb) => cb());
export const subscribeUi = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export const getScope = () => (scope ??= readScope());
export function setScope(next) {
  if (!SCOPES.includes(next) || next === scope) return;
  scope = next;
  try {
    sessionStorage.setItem(SCOPE_KEY, next);
  } catch {
    /* ignore */
  }
  emit();
}
export const getSelectedId = () => selectedId;
export function setSelectedId(id) {
  if (id === selectedId) return;
  selectedId = id;
  emit();
}
