// "Time since alert" clock. It counts from the FIRST status event (the server's time) and freezes when the
// emergency ends. It only measures time; it never claims a medical deadline.
// Note: "now" comes from this device, so a wrong device clock can shift the number a little.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatElapsed, secondsBetween } from '../utils/time';
import Icon from './icons';

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
    <section aria-label={t('clock.title')} className="mt-4 rounded-card bg-white p-4 text-slate-900 shadow-lift">
      <h2 className="flex items-center gap-1 text-sm font-semibold text-slate-700"><Icon name="clock" size={16} />{t('clock.title')}</h2>
      <p className="num text-5xl font-extrabold">{formatElapsed(elapsed)}</p>
      <p className="sr-only" role="status" aria-live="polite">{ANNOUNCE_AT.includes(minutes) ? t('clock.announce', { count: minutes }) : ''}</p>
      <ul className="mt-3 text-sm">
        {MILESTONES.map(([state, key]) => {
          const hit = events.find((e) => e.state === state);
          return (
            <li key={state} className={'flex justify-between gap-2 border-t border-slate-100 py-2 ' + (hit ? 'font-semibold' : 'text-slate-600')}>
              <span className="flex items-center gap-2">{hit && <Icon name="check" size={14} strokeWidth={3} className="text-brand-700" />}{t(key)}</span><span className="num">{hit ? formatElapsed(secondsBetween(start, hit.timestamp)) : t('clock.waiting')}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-600">{t('clock.note')}</p>
    </section>
  );
}
