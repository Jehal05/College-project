// The family screen: link with an invite code, see each linked person's plain status, send a short check-in.
// A relative sees only what the patient shared (the server decides). Never shows a diagnosis or symptoms.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton as Wait } from '../components/ui/Feedback';
import { familyCheckin, familyLink, getFamilyPatients } from '../services/api';
import { connectEvents } from '../services/socket';
import useAuth from '../hooks/useAuth';
import useLazyStrings from '../hooks/useLazyStrings';
import FormField from '../components/FormField';
import ErrorMessage from '../components/ErrorMessage';
import LanguageSelect from '../components/LanguageSelect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Icon from '../components/icons';
import { Chip, Skeleton } from '../components/ui/Feedback';

const BUNDLES = { en: () => import('../i18n/family.en.json'), hi: () => import('../i18n/family.hi.json'), gu: () => import('../i18n/family.gu.json') };

const MESSAGES = ['ON_MY_WAY', 'CALLING_NOW', 'CANNOT_REACH'];
const SHARE = ['location', 'history', 'vitals', 'reports'];

function Emergency({ patient, onChanged }) {
  const { t } = useTranslation();
  const e = patient.active_emergency;
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function send(message) {
    setBusy(true); setNote(''); setError('');
    try { await familyCheckin({ patient_id: patient.patient_id, emergency_id: e.id, message }); setNote(t('family.checkin.done')); onChanged(); }
    catch { setError(t('family.checkin.error')); }
    setBusy(false);
  }
  if (!e) return <p className="mt-3 text-slate-700">{t('family.noEmergency')}</p>;
  const stateKey = 'family.state.' + e.state;
  return (
    <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3" data-testid="family-emergency">
      <h3 className="font-bold text-slate-900">{t('family.activeTitle')}</h3>
      <p className="mt-1 text-lg font-semibold" data-testid="family-state">{t(stateKey, { defaultValue: '' })}</p>
      {e.hospital && <p className="text-slate-800">{t('family.hospital', { name: e.hospital.name })}</p>}
      {Number.isFinite(e.eta_seconds) && e.eta_seconds > 0 && <p className="text-slate-800">{t('family.eta', { minutes: Math.max(1, Math.round(e.eta_seconds / 60)) })}</p>}
      <h4 className="mb-2 mt-3 font-semibold">{t('family.checkin.title')}</h4>
      <div className="grid gap-2">
        {MESSAGES.map((m) => <Button key={m} variant="secondary" disabled={busy} onClick={() => send(m)}>{t('family.checkin.' + m)}</Button>)}
      </div>
      {note && <p role="status" className="mt-2 font-semibold text-emerald-800">{note}</p>}
      {error && <div className="mt-2"><ErrorMessage>{error}</ErrorMessage></div>}
      <a href="tel:112" className="mt-3 flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white font-bold text-slate-900"><Icon name="phone" />{t('emergency.call')}</a>
    </div>
  );
}

function PatientCard({ patient, onChanged }) {
  const { t } = useTranslation();
  const shared = SHARE.filter((k) => patient.shared_fields.includes(k));
  return (
    <Card as="article" aria-label={patient.name} data-testid="family-patient">
      <h2 className="text-xl font-extrabold">{patient.name}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-700">{t('family.shared')}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {shared.length ? shared.map((k) => <Chip key={k} tone="brand">{t('family.share.' + k)}</Chip>) : <span className="text-sm text-slate-700">{t('family.sharedNone')}</span>}
      </div>
      {patient.vitals && (
        <div className="mt-3" data-testid="family-vitals">
          <p className="text-sm font-semibold text-slate-700">{t('family.vitals')}</p>
          <p>{t('family.hr')}: <b>{patient.vitals.heart_rate}</b> &nbsp; {t('family.spo2')}: <b>{patient.vitals.spo2}%</b></p>
        </div>
      )}
      <Emergency patient={patient} onChanged={onChanged} />
    </Card>
  );
}

export default function Family() {
  const { t } = useTranslation();
  const ready = useLazyStrings(BUNDLES);
  const { signOut } = useAuth();
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [linkError, setLinkError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getFamilyPatients().then((list) => { setPatients(list); setError(''); }).catch(() => setError(t('family.loadError'))), [t]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 8000); // a safety net if the live connection drops
    const stop = connectEvents((event) => { if (event.type === 'family.status') load(); }, () => {});
    return () => { clearInterval(timer); stop(); };
  }, [load]);

  async function link(e) {
    e.preventDefault();
    setBusy(true); setLinkError('');
    try { await familyLink(code.trim()); setCode(''); await load(); }
    catch (err) { setLinkError(t(err.status === 404 ? 'family.linkNotFound' : err.status === 410 ? 'family.linkExpired' : 'family.linkError')); }
    setBusy(false);
  }

  if (!ready) return <div role="status" aria-label={t('common.working')}><Wait className="h-32 w-full" /></div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('family.title')}</h1>
      <p className="text-slate-700">{t('family.intro')}</p>
      {error && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{error}</ErrorMessage>}
      {!patients && !error && <div role="status" aria-label={t('common.working')}><Skeleton className="h-32 w-full" /></div>}
      {patients && !patients.length && <p className="text-slate-700" data-testid="family-empty">{t('family.empty')}</p>}
      {patients && patients.map((p) => <PatientCard key={p.patient_id} patient={p} onChanged={load} />)}
      <Card>
        <form onSubmit={link} noValidate>
          <h2 className="mb-2 text-lg font-bold">{t('family.linkTitle')}</h2>
          {linkError && <div className="mb-2"><ErrorMessage>{linkError}</ErrorMessage></div>}
          <FormField label={t('family.codeLabel')} value={code} onChange={setCode} autoComplete="off" required />
          <Button type="submit" full disabled={busy || !code.trim()}>{t('family.linkButton')}</Button>
        </form>
      </Card>
      <LanguageSelect />
      <Button variant="ghost" icon="logout" onClick={signOut}>{t('home.signOut')}</Button>
    </div>
  );
}
