// Values a person types in from a report. They are stored ONLY on this device (localStorage, one list per patient), because
// the backend has no endpoint for them yet (see docs/BACKEND_GAPS.md). A value counts only after the person confirms it.
import { labByKey } from '../config/labs';

const key = (pid) => 'ht.labs.' + pid;
const num = (s) => (String(s).trim() === '' ? null : Number(s));

// Checks a draft from the form. Returns { ok: true, entry } or { ok: false, errors: { field: code } }.
export function validateDraft(d, today = new Date()) {
  const errors = {};
  const lab = labByKey(d.lab);
  if (!lab) errors.lab = 'required';
  const value = num(d.value);
  if (value === null || !Number.isFinite(value)) errors.value = 'required';
  else if (value <= 0 || value > 100000) errors.value = 'range';
  const low = num(d.low); const high = num(d.high);
  if (low !== null && !Number.isFinite(low)) errors.low = 'number';
  if (high !== null && !Number.isFinite(high)) errors.high = 'number';
  if (low !== null && high !== null && Number.isFinite(low) && Number.isFinite(high) && low > high) errors.high = 'order';
  const when = Date.parse(d.date);
  if (!d.date || Number.isNaN(when)) errors.date = 'required';
  else if (when > today.getTime() + 24 * 3600 * 1000) errors.date = 'future';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, entry: { lab: d.lab, value, unit: lab.unit, low, high, date: d.date, reportId: d.reportId || null } };
}

// Compared with the range PRINTED ON THE REPORT (typed by the person). Without a range nothing is claimed.
export function rangeStatus(e) {
  if (e.low === null && e.high === null) return 'norange';
  if (e.low !== null && e.value < e.low) return 'outside';
  if (e.high !== null && e.value > e.high) return 'outside';
  return 'within';
}

export function loadLabs(pid, storage = globalThis.localStorage) {
  try { const list = JSON.parse(storage.getItem(key(pid)) || '[]'); return Array.isArray(list) ? list : []; } catch { return []; }
}
export function saveLabs(pid, list, storage = globalThis.localStorage) {
  try { storage.setItem(key(pid), JSON.stringify(list)); return true; } catch { return false; }
}
export function addLab(pid, entry, storage, now = Date.now()) {
  const list = [{ ...entry, id: 'L' + now.toString(36) + Math.random().toString(36).slice(2, 5), confirmedAt: new Date(now).toISOString() }, ...loadLabs(pid, storage)];
  return saveLabs(pid, list, storage) ? list : null;
}
export function removeLab(pid, id, storage) {
  const list = loadLabs(pid, storage).filter((e) => e.id !== id);
  return saveLabs(pid, list, storage) ? list : null;
}
export const labsForOrgan = (list, organKey) => (list || []).filter((e) => (labByKey(e.lab) || {}).organ === organKey);
