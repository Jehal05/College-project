// Where past (finished) emergencies come from.
//   Mock mode:  the sample past cases + every case you finish in this browser (localStorage).
//   Real mode:  GET /emergencies?status=finished (PROPOSED, includes status_events). Daksh's
//               backend is the store, so nothing is kept in the browser.
import sample from '../data/sample-history.json';
import * as api from './api.js';
import { USE_MOCK } from './config.js';
import { HISTORY_KEY } from './demoReset.js';
import { isFinal } from './stateMachine.js';
import { caseKey } from './cases.js';

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export async function loadHistory() {
  if (USE_MOCK) return [...sample, ...readSaved()];
  try {
    return await api.getHistory();
  } catch (err) {
    if (!api.isMissingEndpoint(err)) throw err;
    return []; // no history endpoint yet: the History page shows the live cases only, with a note
  }
}

/** Mock mode: remember finished cases so they are still there after a page reload. */
export function saveFinished(live) {
  if (!USE_MOCK) return;
  const finished = (live || []).filter((e) => isFinal(e.state) && (e.status_events || []).length > 1);
  if (finished.length === 0) return;
  const saved = readSaved();
  const keys = new Set(saved.map(caseKey));
  const add = finished.filter((e) => !keys.has(caseKey(e))).map(({ _new, _read, ambulance: _ambulance, ...rest }) => rest);
  if (add.length === 0) return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...saved, ...add]));
  } catch {
    /* storage full or blocked: history just will not survive a reload */
  }
}
