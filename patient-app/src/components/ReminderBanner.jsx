// "Time for: <medicine>" with Taken and Remind me in 10 minutes. Shown on top of every screen except the emergency screen
// and the public passport page. Blue, because this is not an emergency. No advice about doses or missed doses.
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useReminderWatcher from '../hooks/useReminderWatcher';
import { formatDateTime } from '../utils/time';

function Banner({ patientId }) {
  const { t } = useTranslation();
  const { due, taken, snooze } = useReminderWatcher(patientId);
  const { pathname } = useLocation();
  if (!due.length || pathname.startsWith('/emergency')) return null;
  const first = due[0];
  const name = first.reminder.name;
  return (
    <section aria-label={t('reminders.bannerLabel')} role="status" className="mb-3 rounded-xl border-2 border-brand-700 bg-brand-50 p-3 text-slate-900">
      <p className="text-lg font-bold">{t('reminders.timeFor', { name })}</p>
      {first.reminder.dose_note && <p className="text-sm">{first.reminder.dose_note}</p>}
      <p className="text-xs text-slate-700">{t('reminders.dueAt', { time: formatDateTime(first.slot.toISOString()) })}</p>
      {due.length > 1 && <p className="text-sm font-semibold">{t('reminders.more', { count: due.length - 1 })}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => taken(first)} className="min-h-[48px] rounded-xl bg-brand-700 hover:bg-brand-800 px-2 font-bold text-white">{t('reminders.taken')}</button>
        <button type="button" onClick={() => snooze(first)} className="min-h-[48px] rounded-xl border-2 border-slate-500 px-2 font-semibold">{t('reminders.snooze')}</button>
      </div>
    </section>
  );
}

export default function ReminderBanner() {
  const { session } = useAuth();
  return session ? <Banner patientId={session.patient_id} /> : null;
}
