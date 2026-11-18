// Live card: heart rate and SpO2 as plain numbers, with a connection chip. Simulated data.
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import { Chip } from './ui/Feedback';
import Icon from './icons';

// One number tile (kept outside the card so React does not rebuild it every second).
function Item({ icon, label, value, unit, source }) {
  return (
    <div className="min-w-[7rem] flex-1 rounded-xl bg-slate-50 p-3">
      <p className="flex items-center gap-1 text-sm font-medium text-slate-700"><Icon name={icon} size={16} className="text-brand-700" />{label}</p>
      <p className="num mt-1 text-3xl font-extrabold text-slate-900">{value ?? '--'}<span className="ml-1 text-base font-medium text-slate-600">{unit}</span></p>
      {source && <p className="mt-1 text-sm font-semibold text-slate-700">{source}</p>}
    </div>
  );
}

export default function VitalsCard({ vitals, connected, strapBpm = null }) {
  const { t } = useTranslation();
  return (
    <Card aria-label={t('home.status')}>
      <p role="status" className="mb-3">
        <Chip tone={connected ? 'success' : 'neutral'} icon={connected ? 'activity' : 'clock'}>{connected ? t('home.status') : t('home.statusOffline')}</Chip>
      </p>
      <div className="flex flex-wrap gap-3">
        {/* A strap number is never mixed silently with a simulated one: the tile says which one it shows. */}
        <Item icon="heart" label={t('home.heartRate')} value={strapBpm ?? vitals?.heart_rate} unit="BPM" source={strapBpm !== null ? t('strap.source.device') : t('strap.source.simulated')} />
        <Item icon="drop" label={t('home.spo2')} value={vitals?.spo2} unit="%" source={t('strap.source.simulated')} />
      </div>
      {!vitals && <p className="mt-3 text-sm text-slate-600">{t('home.waiting')}</p>}
    </Card>
  );
}
