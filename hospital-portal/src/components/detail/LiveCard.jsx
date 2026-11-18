import { useEffect, useState } from 'react';
import { useT } from '../../i18n/index.js';
import PatientMiniMap from '../PatientMiniMap.jsx';
import { hasPosition, liveHeartRate, liveState } from '../../services/liveView.js';

const HR_UNIT = 'bpm';

/** REAL data streamed from the patient's phone while the alert is open: position and chest-strap heart rate. The ambulance is still simulated. */
export default function LiveCard({ emergency: e }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const live = e.live;
  const st = liveState(live, now);
  if (!st) return null;
  const hr = liveHeartRate(live, now);
  const badge = st.state === 'live' ? 'bg-green-700 text-white' : 'bg-amber-200 text-amber-900';
  const label = st.state === 'live' ? t('lv.live') : st.state === 'stopped' ? t('lv.stopped') : t('lv.quiet', { s: st.ageSeconds ?? '?' });
  return (
    <div className="rounded-xl border-2 border-green-700 p-3" data-testid="live-card">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{t('lv.title')}</h3>
        <span role="status" className={'rounded-full px-3 py-1 text-sm font-bold ' + badge}>{label}</span>
      </div>
      <div className="mb-2 rounded-xl bg-slate-100 p-3">
        <div className="text-sm text-slate-500">{t('vitals.heartRate')} · {t('lv.strap')}</div>
        <div className="text-2xl font-bold">{hr ?? '–'} {hr != null && <span className="text-base font-normal">{HR_UNIT}</span>}</div>
      </div>
      {hasPosition(live)
        ? <PatientMiniMap location={{ lat: live.lat, lng: live.lng, accuracy_m: live.accuracy }} label={t('lv.here')} />
        : <p className="rounded-xl bg-slate-100 p-3 text-slate-600">{t('lv.noPosition')}</p>}
      <p className="mt-2 text-sm text-slate-600">{t('lv.note')}</p>
    </div>
  );
}
