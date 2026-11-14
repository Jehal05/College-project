// Home: emergency button, active-emergency banner, greeting, live vitals and the status bar.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useVitals from '../hooks/useVitals';
import { getConsents, getContacts, getEmergency, getPatient } from '../services/api';
import { clearActive, getActive } from '../utils/activeEmergency';
import useBaseline from '../hooks/useBaseline';
import useConsents from '../hooks/useConsents';
import useVitalsHistory from '../hooks/useVitalsHistory';
import VitalsCard from '../components/VitalsCard';
import DigitalTwinBar from '../components/DigitalTwinBar';
import StatusBar from '../components/StatusBar';
import { usePending } from '../hooks/usePendingEmergency';
import NotificationBell from '../components/NotificationBell';
import Icon from '../components/icons';
import Button from '../components/ui/Button';
import { Avatar, SectionHeader } from '../components/ui/Card';

// Quick links under the emergency button: [route, icon, translation key].
const QUICK = [['/passport', 'qr', 'home.passport'], ['/reminders', 'pill', 'home.reminders'], ['/contacts', 'users', 'contacts.title'], ['/reports', 'file', 'reports.title']];

export default function Home() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { vitals, connected } = useVitals();
  const { baseline, status: baselineStatus, reload: reloadBaseline } = useBaseline(session.patient_id);
  const { consents } = useConsents(session.patient_id);
  const sharing = !!consents && consents.vitals === true; // live vitals sharing on: the trend keeps the last minute in memory
  const history = useVitalsHistory(vitals, sharing);
  const [name, setName] = useState('');
  const pending = usePending(); // an emergency that could not be sent yet (offline)
  const [activeId, setActiveId] = useState(null); // only set after we confirmed it is still running

  useEffect(() => {
    getPatient(session.patient_id)
      .then((p) => setName(p.name))
      .catch(() => {}); // a 401 signs out by itself (auth.js)
    // Warm the offline copies the SMS fallback needs (contacts and the location consent), so they exist if the connection drops.
    getContacts(session.patient_id).catch(() => {});
    getConsents(session.patient_id).catch(() => {});
  }, [session.patient_id]);

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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {name && <Avatar name={name} />}
          <h1 className="min-w-0 break-words text-2xl font-extrabold text-slate-900">{name ? t('home.greeting', { name }) : t('app.title')}</h1>
        </div>
        <NotificationBell />
      </div>
      {pending && (
        <div role="status" className="mb-4 rounded-card border-2 border-red-700 bg-red-50 p-4">
          <p className="mb-3 font-bold text-red-900">{t('pending.homeBanner')}</p>
          <Button variant="emergency" to="/symptoms" icon="alert">{t('pending.open')}</Button>
        </div>
      )}
      {activeId && (
        <div role="status" className="mb-4 rounded-card border-2 border-red-700 bg-red-50 p-4">
          <p className="mb-3 font-bold text-red-900">{t('home.activeEmergency')}</p>
          <Button variant="emergency" to={'/emergency/' + activeId} icon="alert">{t('home.returnToEmergency')}</Button>
        </div>
      )}
      <Link to="/symptoms" className="mb-5 flex min-h-[88px] w-full items-center justify-center gap-3 rounded-card bg-red-700 px-4 text-2xl font-extrabold text-white shadow-lift hover:bg-red-800">
        <Icon name="heart" size={32} />{t('home.emergency')}
      </Link>
      <nav aria-label={t('profile.links')} className="mb-2 grid grid-cols-2 gap-3">
        {QUICK.map(([to, icon, key]) => (
          <Link key={to} to={to} className="flex min-h-[88px] flex-col items-start justify-between rounded-card border border-slate-200 bg-white p-3 shadow-card hover:border-brand-600">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon name={icon} /></span>
            <span className="mt-2 break-words text-sm font-bold text-slate-900">{t(key)}</span>
          </Link>
        ))}
      </nav>
      <VitalsCard vitals={vitals} connected={connected} />
      <DigitalTwinBar vitals={vitals} baseline={baseline} status={baselineStatus} onRetry={reloadBaseline}
        history={history} sharing={sharing} sharingOff={!!consents && consents.vitals === false} />
      <SectionHeader>{t('home.state')}</SectionHeader>
      <StatusBar state={vitals?.state || 'MONITORING'} />
      <Button variant="ghost" icon="logout" onClick={signOut} className="mt-8">{t('home.signOut')}</Button>
    </div>
  );
}
