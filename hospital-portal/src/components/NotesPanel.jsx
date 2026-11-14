// Handover and desk notes of one emergency (C1). A handover note is for the next shift; a desk note is a working note.
import { useState } from 'react';
import { useEmergencies } from './EmergencyProvider.jsx';
import { NOTE_KINDS, MAX_NOTE_LENGTH, checkNote, counterText, staffNotes, canAddNote } from '../services/notes.js';
import { useT } from '../i18n/index.js';
import { formatTime } from './AlertCard.jsx';

export default function NotesPanel({ emergency: e }) {
  const { addNote } = useEmergencies();
  const t = useT();
  const [kind, setKind] = useState('handover');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }
  const notes = staffNotes(e.status_events);
  const check = checkNote(text);
  const open = canAddNote(e.state);

  // The check gives a code; the text is shown in the chosen language.
  const errorText = (c) => (c.code === 'long' ? t('notes.errLong', { n: c.over, max: c.max }) : t('notes.errEmpty'));

  async function submit(ev) {
    ev.preventDefault();
    if (!check.ok) return setMessage({ type: 'error', text: errorText(check) });
    setBusy(true);
    setMessage(null);
    try {
      const res = await addNote(e.emergency_id, kind, check.text);
      setText('');
      if (res?.localOnly) setMessage({ type: 'info', text: t('notes.localInfo') });
    } catch (err) {
      setMessage({ type: 'error', text: t('notes.saveFailed', { msg: err.message }) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="notes-panel">
      {notes.length === 0 ? (
        <p data-testid="notes-empty" className="mb-3 text-slate-600">{t('notes.empty')}</p>
      ) : (
        <ul data-testid="notes-list" aria-label={t('notes.listLabel')} className="mb-3 space-y-2">
          {notes.map((n) => (
            <li key={n.note_id || `${n.timestamp}-${n.text}`} data-kind={n.kind} className={`rounded-lg border-l-4 p-3 ${n.kind === 'handover' ? 'border-sky-600 bg-sky-50' : 'border-slate-400 bg-slate-50'}`}>
              <div className="text-sm font-semibold text-slate-600">
                {t(`notes.kind.${n.kind}`)} · {formatTime(n.timestamp)}{n.actor ? ` · ${n.actor}` : ''}
                {n.localOnly && <span data-testid="note-local" className="ml-2 text-amber-800">{t('notes.localOnly')}</span>}
              </div>
              <div className="whitespace-pre-wrap text-lg">{n.text}</div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form onSubmit={submit} className="space-y-2">
          <fieldset className="flex flex-wrap gap-4">
            <legend className="sr-only">{t('notes.type')}</legend>
            {NOTE_KINDS.map((k) => (
              <label key={k} className="flex items-center gap-2 font-semibold">
                <input type="radio" name={`note-kind-${e.emergency_id}`} value={k} checked={kind === k} onChange={() => setKind(k)} data-testid={`note-kind-${k}`} />
                {t(`notes.kind.${k}`)}
              </label>
            ))}
          </fieldset>
          <label className="block">
            <span className="sr-only">{t('notes.text')}</span>
            <textarea
              data-testid="note-input"
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              rows={3}
              aria-describedby={`note-counter-${e.emergency_id}`}
              placeholder={kind === 'handover' ? t('notes.phHandover') : t('notes.phDesk')}
              className="w-full rounded-lg border-2 border-slate-300 p-2 text-lg"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span id={`note-counter-${e.emergency_id}`} data-testid="note-counter" className={`text-sm font-semibold ${check.remaining < 0 ? 'text-red-700' : check.remaining <= 50 ? 'text-amber-800' : 'text-slate-600'}`}>
              {counterText(text)}
              {check.remaining < 0 ? t('notes.over', { n: -check.remaining, max: MAX_NOTE_LENGTH }) : ''}
            </span>
            <button type="submit" data-testid="note-save" disabled={busy || !check.ok} className="ml-auto rounded-lg bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-700 disabled:opacity-50">
              {busy ? t('common.saving') : t('notes.add')}
            </button>
          </div>
          {message && (
            <p data-testid="note-message" role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-lg p-2 font-semibold ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
              {message.text}
            </p>
          )}
        </form>
      ) : (
        <p data-testid="notes-closed" className="text-slate-600">{t('notes.closed')}</p>
      )}
    </div>
  );
}
