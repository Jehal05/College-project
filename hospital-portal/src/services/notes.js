// Handover and desk notes (C1). Pure functions (tests: notes.test.js).
//   handover = for the next shift ("Shift handover" in the report)
//   desk     = a working note for the desk
// Both use POST /emergencies/{id}/notes with kind handover|desk. If the backend has no such endpoint the note stays
// on this screen only and is marked as such.

export const NOTE_KINDS = ['handover', 'desk'];
export const NOTE_KIND_LABELS = { handover: 'Handover note', desk: 'Desk note' };
export const MAX_NOTE_LENGTH = 500;

/** @returns {{ ok: boolean, text: string, length: number, remaining: number, error: string|null }} */
export function checkNote(raw, max = MAX_NOTE_LENGTH) {
  const text = String(raw ?? '').trim();
  const length = text.length;
  const remaining = max - String(raw ?? '').length;
  if (length === 0) return { ok: false, text, length, remaining, error: 'Write a note first.', code: 'empty' };
  if (length > max) return { ok: false, text, length, remaining, error: `The note is ${length - max} characters too long (limit ${max}).`, code: 'long', over: length - max, max };
  return { ok: true, text, length, remaining, error: null, code: null };
}

export const counterText = (raw, max = MAX_NOTE_LENGTH) => `${String(raw ?? '').length} / ${max}`;

export const isStaffNote = (event) => event?.state === 'NOTE' && NOTE_KINDS.includes(event.kind);

/** Handover and desk notes of one emergency, oldest first. */
export const staffNotes = (events = []) =>
  events
    .filter(isStaffNote)
    .map((e) => ({ kind: e.kind, label: NOTE_KIND_LABELS[e.kind], text: e.note, actor: e.actor || null, timestamp: e.timestamp, localOnly: Boolean(e.local_only), note_id: e.note_id || null }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

export const handoverNotes = (events) => staffNotes(events).filter((n) => n.kind === 'handover');

/** Can a note be added in this state? (A closed case takes no more notes.) */
export const canAddNote = (state) => state !== 'CANCELLED' && state !== 'HANDOVER_DONE';

export const LOCAL_ONLY_TEXT = 'Saved on this screen only: the backend has no notes endpoint yet.';
