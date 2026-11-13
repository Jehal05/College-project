// Shows what has happened after the SOS: location source, hospital, ambulance ETA, status and timeline.
import { useTranslation } from 'react-i18next';
import StatusBar from './StatusBar';
import Timeline from './Timeline';

const ETA_STATES = ['AMBULANCE_DISPATCHED', 'EN_ROUTE'];

export default function ResponseCard({ emergency, events }) {
  const { t } = useTranslation();
  const { location, hospital, state, eta_seconds: eta } = emergency;
  // Location label comes from what the server stored, so it is right after a reload too.
  const locationLabel = !location ? t('emergency.locationOff')
    : location.source === 'gps' ? t('emergency.locationReal') : t('emergency.locationDemo');
  return (
    <section aria-label={t('emergency.sent')} className="mt-4 rounded-xl bg-white p-4 text-slate-900">
      <h2 className="mb-2 text-lg font-bold">{t('emergency.sent')}</h2>
      <p className="text-sm text-slate-700">{locationLabel}</p>
      {hospital && <p className="mt-1 font-semibold">{t('emergency.hospital')}: {hospital.name}</p>}
      {typeof eta === 'number' && ETA_STATES.includes(state) && (
        <p className="mt-1 font-semibold">{t('emergency.eta', { minutes: Math.floor(eta / 60), seconds: eta % 60 })}</p>
      )}
      <div className="mt-3"><StatusBar state={state} /></div>
      <h3 className="mb-2 mt-4 font-bold">{t('timeline.title')}</h3>
      <Timeline events={events} />
    </section>
  );
}
