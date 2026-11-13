// Medication reminders. They only work while this app is open, and they never give medical advice.
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
      <Link to="/profile" className="mb-2 inline-flex min-h-[44px] items-center font-semibold text-blue-700 underline">{t('common.back')}</Link>
      <h1 className="mb-1 text-2xl font-bold">{t('reminders.title')}</h1>
      <p role="note" className="mb-1 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{t('reminders.openOnly')}</p>
      <p className="mb-3 text-sm text-slate-700">{t('reminders.missed')}</p>
      <OfflineNote />
      {status === 'loading' && <p role="status">{t('reminders.loading')}</p>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('reminders.loadError')}</ErrorMessage>}
      <ErrorMessage>{problem}</ErrorMessage>
      {status === 'ready' && (
        <>
          {editing ? (
            <ReminderForm initial={editing === 'new' ? null : editing} onCancel={() => setEditing(null)}
              onSave={(body) => (editing === 'new' ? add(body) : update(editing.id, body)).then(() => setEditing(null))} />
          ) : (
            <button type="button" disabled={list.length >= MAX || !online} onClick={() => setEditing('new')}
              className="mb-3 min-h-[48px] w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60">{t('reminders.add')}</button>
          )}
          {list.length >= MAX && <p className="mb-3 text-sm">{t('reminders.maxReached', { count: MAX })}</p>}
          {list.length === 0 && <p>{t('reminders.empty')}</p>}
          <ul className="grid gap-3">
            {list.map((r) => {
              const next = nextDue(r, new Date());
              return (
                <li key={r.id} className="rounded-xl border border-slate-300 p-3">
                  <p className="text-lg font-bold">{r.name}{r.paused ? ' · ' + t('reminders.paused') : ''}</p>
                  {r.dose_note && <p className="text-sm">{r.dose_note}</p>}
                  <p className="text-sm">{r.times.join(', ')} · {r.days.length === 7 ? t('reminders.everyDay') : r.days.map(dayName).join(', ')}</p>
                  {next && <p className="text-xs text-slate-700">{t('reminders.next', { time: formatDateTime(next.toISOString()) })}</p>}
                  {deleting === r.id ? (
                    <ConfirmDialog title={t('reminders.deleteConfirm', { name: r.name })} confirmLabel={t('common.delete')} onCancel={() => setDeleting(null)}
                      onConfirm={() => run(remove(r.id)).then(() => setDeleting(null))} />
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <button type="button" disabled={!online} onClick={() => run(update(r.id, { ...r, paused: !r.paused }))} className="min-h-[44px] rounded-lg border-2 border-slate-400 text-sm font-semibold disabled:opacity-60">{r.paused ? t('reminders.resume') : t('reminders.pause')}</button>
                      <button type="button" disabled={!online} onClick={() => setEditing(r)} className="min-h-[44px] rounded-lg border-2 border-slate-400 text-sm font-semibold disabled:opacity-60">{t('common.edit')}</button>
                      <button type="button" disabled={!online} onClick={() => setDeleting(r.id)} className="min-h-[44px] rounded-lg border-2 border-slate-400 text-sm font-semibold disabled:opacity-60">{t('common.delete')}</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <h2 className="mb-1 mt-5 text-lg font-bold">{t('reminders.logTitle')}</h2>
          {log.length === 0 && <p className="text-sm text-slate-700">{t('reminders.logEmpty')}</p>}
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
