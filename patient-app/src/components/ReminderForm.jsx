// Add or edit one reminder: name, dose note (as written by the doctor), up to 4 times, days of the week.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '../utils/time';
import { validateReminder } from '../utils/reminderSchedule';
import FormField from './FormField';
import ErrorMessage from './ErrorMessage';

const EMPTY = { name: '', dose_note: '', times: ['08:00'], days: [0, 1, 2, 3, 4, 5, 6] };
const dayName = (d) => new Date(2024, 0, 7 + d).toLocaleDateString(currentLocale(), { weekday: 'short' }); // 7 Jan 2024 was a Sunday

export default function ReminderForm({ initial, onSave, onCancel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial ? { name: initial.name, dose_note: initial.dose_note, times: initial.times, days: initial.days } : EMPTY);
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm({ ...form, [k]: v });
  const setTime = (i, v) => set('times')(form.times.map((x, at) => (at === i ? v : x)));
  const toggleDay = (d) => set('days')(form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d].sort());
  const e = (k) => (errors[k] ? t(errors[k]) : undefined);

  async function submit(ev) {
    ev.preventDefault();
    const found = validateReminder(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true); setProblem('');
    try { await onSave({ ...form, name: form.name.trim(), dose_note: form.dose_note.trim(), paused: initial ? initial.paused : false }); }
    catch { setProblem(t('reminders.saveError')); setBusy(false); }
  }
  return (
    <form onSubmit={submit} noValidate className="mb-4 rounded-xl border-2 border-slate-300 p-3">
      <h2 className="mb-2 text-lg font-bold">{initial ? t('reminders.editTitle') : t('reminders.addTitle')}</h2>
      <FormField label={t('reminders.name')} value={form.name} onChange={set('name')} error={e('name')} maxLength={60} />
      <FormField label={t('reminders.doseNote')} value={form.dose_note} onChange={set('dose_note')} error={e('dose_note')} maxLength={60} />
      <fieldset className="mb-3">
        <legend className="mb-1 font-semibold">{t('reminders.times')}</legend>
        {form.times.map((time, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input type="time" value={time} onChange={(ev) => setTime(i, ev.target.value)} aria-label={t('reminders.timeN', { n: i + 1 })}
              className="min-h-[48px] flex-1 rounded-lg border-2 border-slate-400 px-2" />
            {form.times.length > 1 && (
              <button type="button" onClick={() => set('times')(form.times.filter((_, at) => at !== i))}
                className="min-h-[48px] rounded-lg border-2 border-slate-400 px-3 font-semibold">{t('reminders.removeTime')}</button>
            )}
          </div>
        ))}
        {form.times.length < 4 && (
          <button type="button" onClick={() => set('times')([...form.times, '12:00'])} className="min-h-[44px] font-semibold text-blue-800 underline">{t('reminders.addTime')}</button>
        )}
        {e('times') && <p role="alert" className="text-sm font-semibold text-amber-800">{e('times')}</p>}
      </fieldset>
      <fieldset className="mb-3">
        <legend className="mb-1 font-semibold">{t('reminders.days')}</legend>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <button key={d} type="button" aria-pressed={form.days.includes(d)} onClick={() => toggleDay(d)}
              className={'min-h-[44px] min-w-[48px] rounded-lg border-2 px-2 font-semibold ' + (form.days.includes(d) ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-slate-400')}>
              {dayName(d)}
            </button>
          ))}
        </div>
        {e('days') && <p role="alert" className="text-sm font-semibold text-amber-800">{e('days')}</p>}
      </fieldset>
      <ErrorMessage>{problem}</ErrorMessage>
      <button type="submit" disabled={busy} className="mb-2 mt-2 min-h-[48px] w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60">{busy ? t('common.saving') : t('common.save')}</button>
      <button type="button" onClick={onCancel} className="min-h-[48px] w-full rounded-lg border-2 border-slate-400 font-semibold">{t('common.cancel')}</button>
    </form>
  );
}
