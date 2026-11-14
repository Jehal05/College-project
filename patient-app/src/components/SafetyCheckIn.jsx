// "Are you OK?" safety check-in: a full-screen question with a 30 second countdown.
// "I'm OK" closes it. With no answer, the alert starts through the SAME path as the emergency button (beginEmergency),
// so offline "Not sent yet", consent and the Cancel window all still work. Never flashes. Call 112 / 108 is always there.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useOnline from '../hooks/useOnline';
import useCountdown from '../hooks/useCountdown';
import { beginEmergency, setPending } from '../hooks/usePendingEmergency';
import { beep, isMuted, setMuted, stopAlarm, vibrate } from '../utils/alarm';
import { endCheckIn } from '../utils/checkIn';
import { CHECKIN_SECONDS } from '../config/demo';

const SPOKEN = [30, 15, 10, 5]; // screen readers hear the time only at these seconds

export default function SafetyCheckIn({ source }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const onlineNow = useRef(online);
  onlineNow.current = online;
  const okButton = useRef(null);
  const finished = useRef(false);
  const [starting, setStarting] = useState(false);
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => { okButton.current?.focus(); return stopAlarm; }, []);

  const tick = useCallback((left) => { if (left <= 10 || left % 5 === 0) { beep(); vibrate(150); } }, []);
  const done = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setStarting(true);
    let result;
    try {
      result = await beginEmergency(session.patient_id, 'UNKNOWN', [], { source, online: onlineNow.current });
    } catch {
      setPending('UNKNOWN', [], source); // could not reach the server: keep it as "not sent yet", never as sent
      result = { pending: true };
    }
    endCheckIn();
    navigate(result.emergency ? '/emergency/' + result.emergency.id : '/symptoms');
  }, [session.patient_id, source, navigate]);
  const { remaining } = useCountdown(CHECKIN_SECONDS, { onTick: tick, onDone: done });

  const imOk = () => { finished.current = true; stopAlarm(); endCheckIn(); };
  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); };
  // Keep keyboard focus inside the box while it is open.
  const trap = (e) => {
    if (e.key !== 'Tab') return;
    const items = [...e.currentTarget.querySelectorAll('a, button')];
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="checkin-title" onKeyDown={trap}
      className="fixed inset-0 z-50 overflow-y-auto bg-amber-50 p-4 text-slate-900">
      <div className="mx-auto max-w-md text-center">
        <p className="mb-2 text-sm font-semibold">{source === 'FALL_CHECK' ? t('checkin.simulatedFall') : t('checkin.inactivity')}</p>
        <h1 id="checkin-title" className="text-5xl font-extrabold">{t('checkin.title')}</h1>
        <p className="sr-only" aria-live="assertive">{SPOKEN.includes(remaining) ? t('checkin.announce', { count: remaining }) : ''}</p>
        <p className="mt-3 text-lg font-semibold">{starting ? t('checkin.starting') : t('checkin.countdown', { count: remaining })}</p>
        <div aria-hidden="true" className="my-3 text-8xl font-extrabold tabular-nums">{remaining}</div>
        <button ref={okButton} type="button" onClick={imOk} disabled={starting}
          className="mb-3 min-h-[96px] w-full rounded-xl bg-green-700 text-3xl font-extrabold text-white disabled:opacity-60">
          {t('checkin.imOk')}
        </button>
        <a href="tel:112" className="mb-3 flex min-h-[64px] w-full items-center justify-center rounded-xl bg-red-700 text-xl font-bold text-white">
          {t('emergency.call')}
        </a>
        <button type="button" onClick={toggleMute} aria-pressed={muted} className="mb-3 min-h-[48px] w-full rounded-xl border-2 border-slate-500 font-semibold">
          {muted ? t('checkin.soundOff') : t('checkin.soundOn')}
        </button>
        <p className="text-sm text-slate-700">{t('checkin.note')}</p>
      </div>
    </div>
  );
}
