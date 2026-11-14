// Shown instead of the active buttons when an alert is held by ANOTHER hospital (seen under "All hospitals").
// The desk takes it over with a reason; the reason is saved in the timeline. In mock mode the reason is pre-chosen: one click.
import { useState } from 'react';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useAuth } from './AuthProvider.jsx';
import { useT } from '../i18n/index.js';
import { USE_MOCK } from '../services/config.js';
import { REASONS, MAX_REASON, checkReason, defaultReason, takeOverFields, takeOverNote } from '../services/takeOver.js';

// The timeline is written in English, so the saved reason uses these English words in every language.
const EN_LABELS = { demo: 'Demo or training', 'cannot-respond': 'The other hospital cannot respond', nearer: 'We are nearer to the patient' };

export default function TakeOverBox({ emergency: e, heldBy }) {
  const t = useT();
  const { session } = useAuth();
  const { addNote } = useEmergencies();
  const [kind, setKind] = useState(defaultReason(USE_MOCK));
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function takeOver() {
    const check = checkReason(kind, text, EN_LABELS);
    if (!check.ok) return setError(check.code === 'long' ? t('takeover.long', { max: MAX_REASON }) : check.code === 'write' ? t('takeover.write') : t('takeover.choose'));
    setBusy(true);
    setError('');
    try {
      await addNote(e.emergency_id, 'desk', takeOverNote(heldBy, check.reason), takeOverFields(session?.hospital_id, e));
    } catch (err) {
      setError(t('takeover.failed', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="takeover-box" role="group" aria-label={t('takeover.title', { name: heldBy })} className="mb-3 space-y-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-4">
      <p className="text-lg font-bold text-amber-900">{t('takeover.title', { name: heldBy })}</p>
      <p className="text-slate-700">{t('takeover.body')}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">{t('takeover.reason')}</span>
          <select data-testid="takeover-reason" value={kind} onChange={(ev) => setKind(ev.target.value)} className="mt-1 block rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-lg">
            {!kind && <option value="">{t('takeover.choose')}</option>}
            {REASONS.map((r) => (
              <option key={r} value={r}>{t(`takeover.r.${r}`)}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-[12rem] flex-1">
          <span className="text-sm font-semibold text-slate-700">{kind === 'other' ? t('takeover.write') : t('takeover.details')}</span>
          <input data-testid="takeover-text" value={text} maxLength={MAX_REASON} onChange={(ev) => setText(ev.target.value)} className="mt-1 block w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-lg" />
        </label>
        <button data-testid="takeover-confirm" disabled={busy} onClick={takeOver} className="rounded-lg bg-amber-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-amber-700 disabled:opacity-60">
          {busy ? t('takeover.busy') : t('takeover.button')}
        </button>
      </div>
      {error && <p role="alert" className="font-semibold text-red-700">{error}</p>}
    </div>
  );
}
