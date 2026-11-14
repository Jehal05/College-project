// Volunteer responder: nearby alerts with no identity. Accepting shows only what the patient allowed. Simulated; call 112 in a real emergency.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { acceptAlert, getResponderAlerts } from '../services/api';
import { connectEvents } from '../services/socket';
import useAuth from '../hooks/useAuth';
import useLazyStrings from '../hooks/useLazyStrings';
import ErrorMessage from '../components/ErrorMessage';
import LanguageSelect from '../components/LanguageSelect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Icon from '../components/icons';
import { Chip, InlineNotice, Skeleton } from '../components/ui/Feedback';

const BUNDLES = { en: () => import('../i18n/responder.en.json'), hi: () => import('../i18n/responder.hi.json'), gu: () => import('../i18n/responder.gu.json') };

function AlertCard({ alert, onChanged }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true); setError('');
    try { setInfo(await acceptAlert(alert.id)); onChanged(); } catch { setError(t('responder.acceptError')); }
    setBusy(false);
  }
  const accepted = alert.accepted || info;
  return (
    <Card as="article" aria-label={t('category.' + alert.type, { defaultValue: alert.type })} data-testid="responder-alert">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-extrabold">{t('category.' + alert.type, { defaultValue: alert.type })}</h2>
        <Chip tone="warning">{t('responder.state.' + alert.state, { defaultValue: '' })}</Chip>
      </div>
      <p className="mt-1 text-slate-800" data-testid="responder-distance">{t('responder.distance', { metres: alert.distance_m })}</p>
      {error && <div className="mt-2"><ErrorMessage>{error}</ErrorMessage></div>}
      {accepted ? (
        <div className="mt-3 rounded-xl bg-brand-50 p-3" role="status" data-testid="responder-patient">
          <p className="font-semibold">{t('responder.accepted')}</p>
          {info ? (
            <>
              <p className="text-lg font-extrabold">{info.patient.name}</p>
              {info.patient.age != null && <p>{t('responder.age', { age: info.patient.age })}</p>}
              {info.patient.allergies && info.patient.allergies.length > 0 && <p>{t('responder.allergies', { list: info.patient.allergies.join(', ') })}</p>}
              <p>{info.location ? t('responder.location', { latitude: info.location.lat, longitude: info.location.lng }) : t('responder.noLocation')}</p>
            </>
          ) : null}
        </div>
      ) : <div className="mt-3"><Button full disabled={busy} onClick={accept}>{t('responder.accept')}</Button></div>}
    </Card>
  );
}

export default function Responder() {
  const { t } = useTranslation();
  const ready = useLazyStrings(BUNDLES);
  const { signOut } = useAuth();
  const [alerts, setAlerts] = useState(null);
  const [pending, setPending] = useState(false); // 403: not verified yet
  const [error, setError] = useState('');

  const load = useCallback(() => getResponderAlerts().then((l) => { setAlerts(l); setPending(false); setError(''); })
    .catch((e) => { if (e.status === 403) { setPending(true); setAlerts([]); } else setError(t('responder.loadError')); }), [t]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    const stop = connectEvents((event) => { if (event.type === 'responder.alert') load(); }, () => {});
    return () => { clearInterval(timer); stop(); };
  }, [load]);

  if (!ready) return <div role="status" aria-label={t('common.working')}><Skeleton className="h-32 w-full" /></div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('responder.title')}</h1>
      <p className="text-slate-700">{t('responder.intro')}</p>
      {error && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{error}</ErrorMessage>}
      {pending && <InlineNotice tone="warning" role="status">{t('responder.notVerified')}</InlineNotice>}
      {!alerts && !error && <div role="status" aria-label={t('common.working')}><Skeleton className="h-32 w-full" /></div>}
      {alerts && !pending && !alerts.length && <p className="text-slate-700" data-testid="responder-none">{t('responder.none')}</p>}
      {alerts && !pending && alerts.map((a) => <AlertCard key={a.id} alert={a} onChanged={load} />)}
      <LanguageSelect />
      <a href="tel:112" className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white font-bold text-slate-900"><Icon name="phone" />{t('emergency.call')}</a>
      <Button variant="ghost" icon="logout" onClick={signOut}>{t('home.signOut')}</Button>
    </div>
  );
}
