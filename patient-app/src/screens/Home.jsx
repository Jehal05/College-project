// Home: greeting, live vitals card and the emergency status bar (Monitoring for now).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useVitals from '../hooks/useVitals';
import { getPatient } from '../services/api';
import VitalsCard from '../components/VitalsCard';
import StatusBar from '../components/StatusBar';

export default function Home() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { vitals, connected } = useVitals();
  const [name, setName] = useState('');

  useEffect(() => {
    getPatient(session.patient_id)
      .then((p) => setName(p.name))
      .catch((err) => { if (err.status === 401) signOut(); }); // Token no longer valid.
  }, [session.patient_id, signOut]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{name ? t('home.greeting', { name }) : t('app.title')}</h1>
      <VitalsCard vitals={vitals} connected={connected} />
      <h2 className="mb-2 mt-5 text-lg font-bold">{t('home.state')}</h2>
      <StatusBar state={vitals?.state || 'MONITORING'} />
      <button type="button" onClick={signOut} className="mt-8 min-h-[44px] rounded-lg bg-slate-200 px-4 font-semibold">
        {t('home.signOut')}
      </button>
    </div>
  );
}
