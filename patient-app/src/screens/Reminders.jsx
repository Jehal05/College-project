// Medication reminders. They only work while this app is open, and they never give medical advice.
import { useState } from 'react';
import BackLink from '../components/BackLink';
import Button from '../components/ui/Button';
import Icon from '../components/icons';
import { EmptyState, InlineNotice, Skeleton } from '../components/ui/Feedback';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useReminders from '../hooks/useReminders';
import useOnline from '../hooks/useOnline';
import { nextDue } from '../utils/reminderSchedule';
import { currentLocale, formatDateTime } from '../utils/time';
import ReminderForm from '../components/ReminderForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import OfflineNote from '../components/OfflineNote';

const MAX = 8;
// 24-hour "08:00" shown as 8:00 am / 8:00 pm in the person's language.
const clock = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(2024, 0, 1, h, m).toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit', hour12: true }); };
const dayName = (d) => new Date(2024, 0, 7 + d).toLocaleDateString(currentLocale(), { weekday: 'short' });

export default function Reminders() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const online = useOnline();
  const { list, log, status, load, add, update, remove } = useReminders(session.patient_id);
  const [editing, setEditing] = useState(null); // 'new' | a reminder | null
  const [deleting, setDeleting] = useState(null);
  const [problem, setProblem] = useState('');
  const nameOf = (id) => (list.find((r) => r.id === id) || {}).name || '';
  const run = (promise) => promise.then(() => { setProblem(''); }).catch(() => setProblem(t('reminders.saveError')));

  return (
    <div>
      <BackLink />
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('reminders.title')}</h1>
      <InlineNotice tone="warning" role="note" className="mb-2 font-semibold">{t('reminders.openOnly')}</InlineNotice>
      <p className="mb-3 text-sm text-slate-700">{t('reminders.missed')}</p>
      <OfflineNote />
      {status === 'loading' && <div role="status" aria-label={t('reminders.loading')} className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('reminders.loadError')}</ErrorMessage>}
      <ErrorMessage>{problem}</ErrorMessage>
      {status === 'ready' && (
        <>
          {editing ? (
            <ReminderForm initial={editing === 'new' ? null : editing} onCancel={() => setEditing(null)}
              onSave={(body) => (editing === 'new' ? add(body) : update(editing.id, body)).then(() => setEditing(null))} />
          ) : (
            <Button full icon="plus" className="mb-3" disabled={list.length >= MAX || !online} onClick={() => setEditing('new')}>{t('reminders.add')}</Button>
          )}
          {list.length >= MAX && <p className="mb-3 text-sm">{t('reminders.maxReached', { count: MAX })}</p>}
          {list.length === 0 && <EmptyState icon="pill" title={t('reminders.empty')} />}
          <ul className="grid gap-3">
            {list.map((r) => {
              const next = nextDue(r, new Date());
              return (
                <li key={r.id} className="rounded-card border border-slate-200 bg-white p-3 shadow-card">
                  <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name="pill" /></span>
                  <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-bold">{r.name}{r.paused ? ' · ' + t('reminders.paused') : ''}</p>
                  {r.dose_note && <p className="text-sm text-slate-700">{r.dose_note}</p>}
                  <p className="text-sm text-slate-700">{r.times.map(clock).join(', ')} · {r.days.length === 7 ? t('reminders.everyDay') : r.days.map(dayName).join(', ')}</p>
                  {next && <p className="text-xs text-slate-600">{t('reminders.next', { time: formatDateTime(next.toISOString()) })}</p>}
                  </div></div>
                  {deleting === r.id ? (
                    <ConfirmDialog title={t('reminders.deleteConfirm', { name: r.name })} confirmLabel={t('common.delete')} onCancel={() => setDeleting(null)}
                      onConfirm={() => run(remove(r.id)).then(() => setDeleting(null))} />
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Button variant="secondary" disabled={!online} onClick={() => run(update(r.id, { ...r, paused: !r.paused }))} className="!px-2 text-sm">{r.paused ? t('reminders.resume') : t('reminders.pause')}</Button>
                      <Button variant="secondary" disabled={!online} onClick={() => setEditing(r)} className="!px-2 text-sm">{t('common.edit')}</Button>
                      <Button variant="secondary" disabled={!online} onClick={() => setDeleting(r.id)} className="!px-2 text-sm">{t('common.delete')}</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <h2 className="mb-1 mt-6 text-lg font-bold">{t('reminders.logTitle')}</h2>
          {log.length === 0 && <EmptyState icon="clock" title={t('reminders.logEmpty')} />}
          <ul className="text-sm">
            {log.slice(0, 14).map((e) => (
              <li key={e.reminder_id + e.scheduled_for} className="py-1">
                {nameOf(e.reminder_id)} · {formatDateTime(e.scheduled_for)} · {e.taken_at ? t('reminders.takenAt', { time: formatDateTime(e.taken_at) }) : t('reminders.notMarked')}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
