// Countdown before the SOS is sent (Feature 16).
// Beeps and vibrates every second, shows a ring that empties, and offers "I'm OK, cancel" (biggest button) and "Send now".
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useCountdown from '../hooks/useCountdown';
import { beep, vibrate, stopAlarm } from '../utils/alarm';
import { COUNTDOWN_SECONDS } from '../config/demo';
import Icon from './icons';

const R = 70; // ring radius in the 160 x 160 drawing
const LENGTH = 2 * Math.PI * R;

export default function Countdown({ initial = COUNTDOWN_SECONDS, onDone, onCancel }) {
  const { t } = useTranslation();
  const tick = useCallback(() => { beep(); vibrate(200); }, []);
  const { remaining, skip } = useCountdown(initial, { onTick: tick, onDone });
  useEffect(() => stopAlarm, []); // free the audio device when this block closes

  // Screen readers hear the time only at 10, 5, 3, 2 and 1 seconds, so it is not noisy.
  const spoken = [10, 5, 3, 2, 1].includes(remaining) ? t('emergency.countdown', { count: remaining }) : '';
  const share = Math.max(0, Math.min(1, remaining / COUNTDOWN_SECONDS));

  return (
    <section className="mt-4 rounded-card bg-white p-4 text-center text-slate-900 shadow-lift">
      <p className="sr-only" aria-live="assertive">{spoken}</p>
      <p className="text-lg font-semibold">{t('emergency.countdown', { count: remaining })}</p>
      <div className="relative mx-auto my-3 h-40 w-40">
        <svg viewBox="0 0 160 160" aria-hidden="true" className="absolute inset-0 -rotate-90">
          <circle cx="80" cy="80" r={R} fill="none" stroke="#fee2e2" strokeWidth="12" />
          <circle cx="80" cy="80" r={R} fill="none" stroke="#b91c1c" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={LENGTH} strokeDashoffset={LENGTH * (1 - share)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div role="timer" aria-hidden="true" className="num absolute inset-0 flex items-center justify-center text-7xl font-extrabold text-red-700">{remaining}</div>
      </div>
      <button type="button" onClick={onCancel}
        className="mb-3 flex min-h-[80px] w-full items-center justify-center gap-2 rounded-xl bg-green-700 text-2xl font-extrabold text-white hover:bg-green-800">
        <Icon name="check" size={28} strokeWidth={3} />{t('emergency.imOk')}
      </button>
      <button type="button" onClick={skip}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-400 text-lg font-semibold hover:bg-slate-50">
        <Icon name="send" size={20} />{t('emergency.sendNow')}
      </button>
    </section>
  );
}
