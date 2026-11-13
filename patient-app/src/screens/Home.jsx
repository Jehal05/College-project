// Home: emergency button, active-emergency banner, greeting, live vitals and the status bar.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useVitals from '../hooks/useVitals';
import { getEmergency, getPatient } from '../services/api';
import { clearActive, getActive } from '../utils/activeEmergency';
import useBaseline from '../hooks/useBaseline';
import VitalsCard from '../components/VitalsCard';
import DigitalTwinBar from '../components/DigitalTwinBar';
import StatusBar from '../components/StatusBar';
import { usePending } from '../hooks/usePendingEmergency';

export default function Home() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { vitals, connected } = useVitals();
  const { baseline, status: baselineStatus, reload: reloadBaseline } = useBaseline(session.patient_id);
  const [name, setName] = useState('');
  const pending = usePending(); // an emergency that could not be sent yet (offline)
  const [activeId, setActiveId] = useState(null); // only set after we confirmed it is still running

  useEffect(() => {
    getPatient(session.patient_id)
      .then((p) => setName(p.name))
      .catch((err) => { if (err.status === 401) signOut(); }); // Token no longer valid.
  }, [session.patient_id, signOut]);

  // If an emergency was running, check it is not finished before showing the banner.
  useEffect(() => {
    const id = getActive();
    if (!id) return;
    getEmergency(id)
      .then((e) => {
        if (e.state === 'CANCELLED' || e.state === 'HANDOVER_DONE') clearActive();
        else setActiveId(id);
      })
      .catch((err) => { if (err.status === 404) clearActive(); });
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{name ? t('home.greeting', { name }) : t('app.title')}</h1>
      {pending && (
        <div role="status" className="mb-4 rounded-xl border-2 border-red-700 bg-red-50 p-3">
          <p className="mb-2 font-bold text-red-900">{t('pending.homeBanner')}</p>
          <Link to="/symptoms" className="inline-flex min-h-[48px] items-center rounded-lg bg-red-700 px-4 font-bold text-white">{t('pending.open')}</Link>
        </div>
      )}
      {activeId && (
        <div role="status" className="mb-4 rounded-xl border-2 border-red-700 bg-red-50 p-3">
          <p className="mb-2 font-bold text-red-900">{t('home.activeEmergency')}</p>
          <Link to={'/emergency/' + activeId} className="inline-flex min-h-[48px] items-center rounded-lg bg-red-700 px-4 font-bold text-white">
            {t('home.returnToEmergency')}
          </Link>
        </div>
      )}
      <Link to="/symptoms" className="mb-5 flex min-h-[80px] w-full items-center justify-center rounded-xl bg-red-700 text-2xl font-extrabold text-white shadow">
        {t('home.emergency')}
      </Link>
      <VitalsCard vitals={vitals} connected={connected} />
      <DigitalTwinBar vitals={vitals} baseline={baseline} status={baselineStatus} onRetry={reloadBaseline} />
      <h2 className="mb-2 mt-5 text-lg font-bold">{t('home.state')}</h2>
      <StatusBar state={vitals?.state || 'MONITORING'} />
      <button type="button" onClick={signOut} className="mt-8 min-h-[44px] rounded-lg bg-slate-200 px-4 font-semibold">
        {t('home.signOut')}
      </button>
    </div>
  );
}
