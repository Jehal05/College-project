// While an alert is open: send the phone's real GPS position and heart-rate strap reading to the hospital screen. The person is in control:
// consent switches decide what may be sent, "Stop sharing" ends it. The ambulance is still simulated, this stream is real.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { postLive, stopLive } from '../services/api';
import { OPEN_STATES, createLiveShare } from '../services/liveShare';
import { getUseDemo } from '../services/geo';
import useHeartStrap from '../hooks/useHeartStrap';
import StrapConnect from './StrapConnect';

export default function LiveShare({ emergencyId, state, consents }) {
  const { t } = useTranslation();
  const locationConsent = !consents || consents.location !== false;
  const vitalsConsent = !consents || consents.vitals !== false;
  const practice = getUseDemo(); // practice location mode: no real position is streamed
  const strap = useHeartStrap(vitalsConsent);
  const bpmRef = useRef(null);
  bpmRef.current = strap.bpm;
  const [stopped, setStopped] = useState(false);
  const [status, setStatus] = useState('idle');
  const open = OPEN_STATES.includes(state);
  const wantLocation = locationConsent && !practice;

  useEffect(() => {
    if (!open || stopped) return undefined;
    const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
    const share = createLiveShare({ post: (body) => postLive(emergencyId, body), geolocation, getBpm: () => bpmRef.current, locationOn: wantLocation, heartOn: vitalsConsent, onStatus: setStatus });
    share.start();
    return () => share.stop();
  }, [open, stopped, emergencyId, wantLocation, vitalsConsent]);

  if (!open) return null;
  const stop = () => { setStopped(true); setStatus('idle'); stopLive(emergencyId).catch(() => {}); };
  let line;
  if (stopped) line = t('live.stopped');
  else if (!wantLocation && !vitalsConsent) line = t('live.consentOff');
  else if (status === 'denied') line = t('live.denied');
  else if (status === 'error') line = t('live.error');
  else if (status === 'ended') line = t('live.ended');
  else if (status === 'sharing') line = t(strap.bpm ? 'live.sharingBoth' : 'live.sharingLocation');
  else line = t('live.waiting');

  return (
    <section className="mt-3 rounded-xl bg-white p-3 text-slate-900" aria-label={t('live.title')}>
      <h2 className="text-base font-bold">{t('live.title')}</h2>
      <p className="mt-1 font-semibold" role="status">{line}</p>
      {practice && locationConsent && !stopped && <p className="mt-1 text-sm">{t('live.practice')}</p>}
      <p className="mt-1 text-sm">{t('live.note')}</p>
      {!stopped && vitalsConsent && <StrapConnect strap={strap} consentOn={vitalsConsent} />}
      <button type="button" onClick={stopped ? () => setStopped(false) : stop} className="mt-2 min-h-[48px] rounded-xl border-2 border-red-800 px-4 font-bold text-red-800">
        {stopped ? t('live.resume') : t('live.stop')}
      </button>
    </section>
  );
}
