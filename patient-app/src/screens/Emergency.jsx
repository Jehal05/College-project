// Feature 5: the red emergency screen. Shows the countdown first, then the live hospital response.
// Always shows the Call 112 / 108 button, even while loading or when something fails.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useEmergency from '../hooks/useEmergency';
import { cancelEmergency, sendSos } from '../services/api';
import { resolveLocation } from '../services/geo';
import { COUNTDOWN_SECONDS } from '../config/demo';
import { clearActive, getStarted, setActive } from '../utils/activeEmergency';
import { stopAlarm } from '../utils/alarm';
import CallButton from '../components/CallButton';
import EmergencyHeader from '../components/EmergencyHeader';
import Countdown from '../components/Countdown';
import ResponseCard from '../components/ResponseCard';
import GoldenHourClock from '../components/GoldenHourClock';
import ContactsNotified from '../components/ContactsNotified';
import InstructionsCard from '../components/InstructionsCard';
import WhyThisAlert from '../components/WhyThisAlert';
import ErrorMessage from '../components/ErrorMessage';

const CAN_CANCEL_AFTER_SOS = ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE'];

// Seconds still left in the countdown. Uses this device's clock when we know when it started.
function secondsLeft(emergency, id) {
  const start = getStarted(id) || new Date(emergency.status_events[0].timestamp).getTime();
  const elapsed = Math.floor((Date.now() - start) / 1000);
  return Math.min(COUNTDOWN_SECONDS, Math.max(0, COUNTDOWN_SECONDS - elapsed));
}

export default function Emergency() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const backOnline = useLocation().state?.backOnline; // we got here by sending an alert that was waiting for the connection
  const { emergency, events, connected, error, reload } = useEmergency(id);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState('');
  const [confirming, setConfirming] = useState(false);
  const sentOnce = useRef(false); // the SOS must only be sent once
  const cancelled = useRef(false);
  const state = emergency ? emergency.state : null;

  // Remember the running emergency; leave if it was cancelled.
  useEffect(() => {
    if (!state) return;
    if (state === 'CANCELLED') { clearActive(); stopAlarm(); navigate('/cancelled', { replace: true, state: { id } }); }
    else if (state === 'HANDOVER_DONE') clearActive();
    else setActive(id);
  }, [state, id, navigate]);

  async function send() {
    if (sentOnce.current || cancelled.current) return;
    sentOnce.current = true;
    setSending(true);
    setProblem('');
    try {
      const location = await resolveLocation(!emergency.consents || emergency.consents.location !== false);
      await sendSos(id, location);
      await reload();
    } catch {
      sentOnce.current = false;
      if (!cancelled.current) setProblem(t('emergency.sendError'));
    } finally {
      setSending(false);
    }
  }

  async function cancel() {
    cancelled.current = true;
    setProblem('');
    setConfirming(false);
    try {
      await cancelEmergency(id);
      stopAlarm();
      clearActive();
      navigate('/cancelled', { replace: true, state: { id } });
    } catch {
      cancelled.current = false;
      setProblem(t('emergency.cancelError'));
    }
  }

  const page = 'relative -m-4 min-h-screen bg-red-700 p-4 text-white';
  if (!emergency) {
    return (
      <div className={page}>
        <CallButton onRed />
        <div className="mt-4">
          {error
            ? <ErrorMessage onRetry={reload} retryLabel={t('emergency.retry')}>{t('emergency.loadError')}</ErrorMessage>
            : <p role="status">{t('emergency.loading')}</p>}
        </div>
      </div>
    );
  }

  const counting = state === 'EMERGENCY_DETECTED';
  return (
    <div className={page}>
      <EmergencyHeader type={emergency.type} connected={connected} />
      <CallButton onRed />
      <p className="sr-only" role="status" aria-live="polite">{t('state.' + state)}</p>
      {backOnline && (
        <p role="status" className="mt-3 rounded-lg bg-white p-3 font-semibold text-slate-900">
          {state === 'EMERGENCY_DETECTED' ? t('emergency.backOnlineSending') : t('emergency.backOnlineSent')}
        </p>
      )}

      {counting && (
        <>
          <Countdown key={id} initial={secondsLeft(emergency, id)} onDone={send} onCancel={cancel} />
          {sending && <p role="status" className="mt-3 font-semibold">{t('emergency.sending')}</p>}
        </>
      )}
      {problem && (
        <div className="mt-3">
          <ErrorMessage onRetry={counting ? send : undefined} retryLabel={t('emergency.retry')}>{problem}</ErrorMessage>
        </div>
      )}
      {!counting && (
        <>
          <GoldenHourClock events={events} />
          <ResponseCard emergency={emergency} events={events} />
          <ContactsNotified emergency={emergency} />
        </>
      )}
      {emergency.source && emergency.source !== 'MANUAL' && (
        <p role="status" className="mt-3 rounded-lg bg-white p-3 font-semibold text-slate-900">{t('emergency.fromCheckIn')}</p>
      )}
      <WhyThisAlert emergencyId={id} source={emergency.source} />
      <InstructionsCard type={emergency.type} />

      {state === 'HANDOVER_DONE' && (
        <section role="status" className="mt-4 rounded-xl bg-white p-4 text-slate-900">
          <p className="mb-3 font-semibold">{t('emergency.done')}</p>
          <Link to={'/summary/' + id} className="mb-2 flex min-h-[48px] items-center justify-center rounded-lg border-2 border-blue-700 px-4 font-bold text-blue-800">{t('emergency.viewSummary')}</Link>
          <Link to="/" className="inline-flex min-h-[48px] items-center rounded-lg bg-blue-700 px-4 font-bold text-white">{t('emergency.back')}</Link>
        </section>
      )}

      {CAN_CANCEL_AFTER_SOS.includes(state) && !confirming && (
        <button type="button" onClick={() => setConfirming(true)}
          className="mt-4 min-h-[48px] w-full rounded-xl border-2 border-white text-base font-semibold">
          {t('emergency.falseAlarm')}
        </button>
      )}
      {confirming && (
        <div role="alertdialog" aria-labelledby="confirm-title" className="mt-4 rounded-xl bg-white p-4 text-slate-900">
          <p id="confirm-title" className="mb-3 font-semibold">{t('emergency.confirmCancel')}</p>
          <button type="button" onClick={cancel} className="mb-2 min-h-[52px] w-full rounded-lg bg-green-700 font-bold text-white">{t('emergency.confirmYes')}</button>
          <button type="button" onClick={() => setConfirming(false)} className="min-h-[52px] w-full rounded-lg border-2 border-slate-400 font-semibold">{t('emergency.confirmNo')}</button>
        </div>
      )}
    </div>
  );
}
