// "Time since alert" clock. It counts from the FIRST status event (the server's time) and freezes when the
// emergency ends. It only measures time; it never claims a medical deadline.
// Note: "now" comes from this device, so a wrong device clock can shift the number a little.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatElapsed, secondsBetween } from '../utils/time';

const ENDED = ['HANDOVER_DONE', 'CANCELLED'];
const MILESTONES = [
  ['SOS_SENT', 'clock.alertSent'], ['HOSPITAL_ACKNOWLEDGED', 'clock.acknowledged'],
  ['AMBULANCE_DISPATCHED', 'clock.dispatched'], ['ARRIVED', 'clock.arrived'],
];
const ANNOUNCE_AT = [1, 5, 10, 30, 60]; // minutes at which screen readers are told the time

export default function GoldenHourClock({ events }) {
  const { t } = useTranslation();
  const start = events[0] ? events[0].timestamp : null;
  const ended = events.find((e) => ENDED.includes(e.state));
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!start || ended) return undefined; // frozen: no timer needed
    const timer = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(timer);
  }, [start, ended]);

  if (!start) return null;
  const elapsed = secondsBetween(start, ended ? ended.timestamp : now);
  const minutes = Math.floor(elapsed / 60);
  return (
    <section aria-label={t('clock.title')} className="mt-4 rounded-xl bg-white p-4 text-slate-900">
      <h2 className="text-sm font-semibold text-slate-700">{t('clock.title')}</h2>
      <p className="text-5xl font-extrabold tabular-nums">{formatElapsed(elapsed)}</p>
      <p className="sr-only" role="status" aria-live="polite">{ANNOUNCE_AT.includes(minutes) ? t('clock.announce', { count: minutes }) : ''}</p>
      <ul className="mt-3 text-sm">
        {MILESTONES.map(([state, key]) => {
          const hit = events.find((e) => e.state === state);
          return (
            <li key={state} className={'flex justify-between py-1 ' + (hit ? 'font-semibold' : 'text-slate-600')}>
              <span>{t(key)}</span><span>{hit ? formatElapsed(secondsBetween(start, hit.timestamp)) : t('clock.waiting')}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-600">{t('clock.note')}</p>
    </section>
  );
}
