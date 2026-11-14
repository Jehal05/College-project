// Staff activity log (C4): one list built from what the cases already carry (timeline, notes, checklist ticks).
// Pure functions (tests: activity.test.js). Tokens and passwords are never shown: text is cleaned before display.
import { STATE_LABELS, TYPE_LABELS } from './contract.js';
import { NOTE_KIND_LABELS } from './notes.js';
import { caseKey } from './cases.js';

export const KINDS = ['all', 'state', 'note', 'checklist'];
export const WHO = ['all', 'staff', 'patient', 'ambulance', 'system'];

/** Hide anything that looks like a token or a password. */
export function redact(text) {
  return String(text ?? '')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [hidden]')
    .replace(/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.?[A-Za-z0-9_-]*/g, '[token hidden]')
    .replace(/\b(token|access_token|password|secret)=\S+/gi, '$1=[hidden]');
}

export function actorGroup(actor) {
  if (!actor) return 'system';
  if (/^patient/i.test(actor)) return 'patient';
  if (/^ambulance/i.test(actor)) return 'ambulance';
  if (/^system/i.test(actor)) return 'system';
  return 'staff';
}

/** @param cases emergencies (live + history)  @param checklists the checklists.json object (item texts) */
export function buildActivity(cases = [], checklists = {}) {
  const out = [];
  for (const e of cases) {
    const base = { emergency_id: e.emergency_id, type: e.type ?? null, type_label: TYPE_LABELS[e.type] || e.type || 'Alert', case_key: caseKey(e) };
    (e.status_events || []).forEach((ev, i) => {
      const ts = ev.timestamp;
      if (!Number.isFinite(Date.parse(ts))) return;
      const isNote = ev.state === 'NOTE';
      const text = isNote
        ? `${NOTE_KIND_LABELS[ev.kind] || 'Note'}: ${redact(ev.note)}`
        : `${STATE_LABELS[ev.state] || ev.state}${ev.note ? ` (${redact(ev.note)})` : ''}`;
      out.push({ ...base, id: `${base.case_key}|s|${i}`, ts, kind: isNote ? 'note' : 'state', actor: ev.actor || null, who: actorGroup(ev.actor), text, local_only: Boolean(ev.local_only) });
    });
    const items = new Map((checklists[e.type] || []).map((it) => [it.id, it.text]));
    for (const [itemId, tick] of Object.entries(e.checklist || {})) {
      if (!tick || !Number.isFinite(Date.parse(tick.at))) continue;
      out.push({ ...base, id: `${base.case_key}|c|${itemId}`, ts: tick.at, kind: 'checklist', actor: tick.by || null, who: actorGroup(tick.by), text: `${tick.done ? 'Ticked' : 'Unticked'}: ${items.get(itemId) || itemId}`, local_only: false });
    }
  }
  return out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts) || (a.id < b.id ? 1 : -1)); // newest first
}

/** filters: { kind, who, text } */
export function filterActivity(entries, { kind = 'all', who = 'all', text = '' } = {}) {
  const q = String(text).trim().toLowerCase();
  return entries.filter(
    (x) =>
      (kind === 'all' || x.kind === kind) &&
      (who === 'all' || x.who === who) &&
      (!q || [x.emergency_id, x.text, x.actor, x.type_label].some((v) => String(v ?? '').toLowerCase().includes(q))),
  );
}

/**
 * Server audit rows (GET /audit, admin only). Only known, safe fields are copied, so a token could never reach the screen
 * even if a backend sent one by mistake.
 */
export function auditRows(data) {
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items.map((r, i) => ({
    id: r.id ?? i,
    time: r.timestamp ?? null,
    user: r.user_id ?? null,
    role: r.role ?? null,
    action: redact(r.action),
    patient: r.patient_id ?? r.resource_id ?? null,
    outcome: r.outcome ?? null,
    reason: r.reason ? redact(r.reason) : null,
    fields: Array.isArray(r.fields_released) ? r.fields_released.map(String) : [],
  }));
}

/** Plain words for a failed GET /audit. */
export function auditError(err) {
  if (err?.missing || err?.status === 404 || err?.status === 405 || err?.status === 501) return { kind: 'missing', text: 'The backend has no audit log yet.' };
  if (err?.status === 403) return { kind: 'forbidden', text: 'Only an admin account can read the audit log.' };
  if (err?.status === 401) return { kind: 'login', text: 'Your login has expired. Log in again.' };
  return { kind: 'error', text: `Could not load the audit log: ${redact(err?.message || 'unknown error')}` };
}
