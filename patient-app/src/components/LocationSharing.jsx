// Shown during the countdown: says in plain words what location will be sent, and lets the person stop sharing it.
// Only the coordinates go to this app's own server, and only with the location consent on. "Stop sharing" sends the alert without a location.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getUseDemo, gpsPermission, isSharingStopped, resumeSharing, stopSharing } from '../services/geo';

export default function LocationSharing({ emergencyId, consent }) {
  const { t } = useTranslation();
  const [stopped, setStopped] = useState(isSharingStopped(emergencyId));
  const [permission, setPermission] = useState('prompt');
  useEffect(() => { gpsPermission().then(setPermission); }, []);

  let line;
  if (!consent) line = t('loc.consentOff');
  else if (stopped) line = t('loc.stopped');
  else if (getUseDemo() || permission === 'unsupported') line = t('loc.willSimulated');
  else if (permission === 'denied') line = t('loc.denied');
  else line = t('loc.willGps');

  const toggle = () => {
    if (stopped) { resumeSharing(); setStopped(false); } else { stopSharing(emergencyId); setStopped(true); }
  };
  return (
    <section className="mt-3 rounded-xl bg-white p-3 text-slate-900" aria-label={t('loc.title')}>
      <p className="font-semibold" role="status">{line}</p>
      {consent && (
        <button type="button" onClick={toggle} className="mt-2 min-h-[48px] rounded-xl border-2 border-red-800 px-4 font-bold text-red-800">
          {stopped ? t('loc.resume') : t('loc.stop')}
        </button>
      )}
    </section>
  );
}
