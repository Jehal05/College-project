// Countdown before the SOS is sent (Feature 16).
// Beeps and vibrates every second, and offers "I'm OK, cancel" (biggest button) and "Send now".
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useCountdown from '../hooks/useCountdown';
import { beep, vibrate, stopAlarm } from '../utils/alarm';
import { COUNTDOWN_SECONDS } from '../config/demo';

export default function Countdown({ initial = COUNTDOWN_SECONDS, onDone, onCancel }) {
  const { t } = useTranslation();
  const tick = useCallback(() => { beep(); vibrate(200); }, []);
  const { remaining, skip } = useCountdown(initial, { onTick: tick, onDone });
  useEffect(() => stopAlarm, []); // free the audio device when this block closes

  // Screen readers hear the time only at 10, 5, 3, 2 and 1 seconds, so it is not noisy.
  const spoken = [10, 5, 3, 2, 1].includes(remaining) ? t('emergency.countdown', { count: remaining }) : '';

  return (
    <section className="mt-4 rounded-xl bg-white p-4 text-center text-slate-900">
      <p className="sr-only" aria-live="assertive">{spoken}</p>
      <p className="text-lg font-semibold">{t('emergency.countdown', { count: remaining })}</p>
      <div role="timer" aria-hidden="true" className="my-2 text-8xl font-extrabold text-red-700">{remaining}</div>
      <button type="button" onClick={onCancel}
        className="mb-3 min-h-[80px] w-full rounded-xl bg-green-700 text-2xl font-bold text-white">
        {t('emergency.imOk')}
      </button>
      <button type="button" onClick={skip}
        className="min-h-[56px] w-full rounded-xl border-2 border-slate-400 text-lg font-semibold">
        {t('emergency.sendNow')}
      </button>
    </section>
  );
}
