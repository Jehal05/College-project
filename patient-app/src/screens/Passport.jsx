// Health passport: make a QR code that opens a read-only page for a responder or doctor.
// The QR holds only a link with a random token; what the page shows follows the consent settings.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { InlineNotice, Skeleton } from '../components/ui/Feedback';
import BackLink from '../components/BackLink';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useOnline from '../hooks/useOnline';
import usePassport from '../hooks/usePassport';
import { passportLink, APP_URL, isLocalAddress } from '../config/env';
import { getPassportPreview } from '../services/api';
import PassportQuickView from '../components/PassportQuickView';
import PassportCard from '../components/PassportCard';
import { timeLeft } from '../utils/passportTime';
import { formatDateTime } from '../utils/time';
import PassportQr from '../components/PassportQr';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import OfflineNote from '../components/OfflineNote';

const CHOICES = [[1, 'passport.hours1'], [24, 'passport.hours24'], [168, 'passport.days7']];
const FIELDS = [['blood_group', 'passport.f.blood'], ['allergies', 'passport.f.allergies'], ['contact', 'passport.f.contact']];
const WHO = { anonymous: 'passport.who.anonymous', staff: 'passport.who.staff' };
const PURPOSE = { emergency_treatment: 'passport.p.emergency_treatment', admission_check: 'passport.p.admission_check', ambulance_handover: 'passport.p.ambulance_handover', follow_up: 'passport.p.follow_up' };

export default function Passport() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const online = useOnline();
  const { status, passport, log, history, publicUrl, create, revoke, reload } = usePassport(session.patient_id);
  const [fields, setFields] = useState(FIELDS.map(([k]) => k));
  const [preview, setPreview] = useState(null);
  const [rotating, setRotating] = useState(false);
  useEffect(() => {
    let off = false;
    getPassportPreview(session.patient_id, fields).then((d) => { if (!off) setPreview(d); }).catch(() => { if (!off) setPreview(null); });
    return () => { off = true; };
  }, [session.patient_id, fields]);
  const base = publicUrl || APP_URL;
  const toggle = (k) => setFields((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState('');
  const [, tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(timer); }, []);

  async function run(action, failKey) {
    setBusy(true); setProblem('');
    try { await action(); setConfirming(false); } catch { setProblem(t(failKey)); } finally { setBusy(false); }
  }

  const Fields = () => (
    <fieldset className="mb-4">
      <legend className="mb-1 font-semibold">{t('passport.fields')}</legend>
      <p className="mb-1 text-sm text-slate-700">{t('passport.fieldsHelp')}</p>
      {FIELDS.map(([k, key]) => (
        <label key={k} className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 text-lg hover:bg-slate-50">
          <input type="checkbox" checked={fields.includes(k)} onChange={() => toggle(k)} className="h-6 w-6" />{t(key)}
        </label>
      ))}
    </fieldset>
  );
  const Preview = () => preview && (
    <details className="mb-4 rounded-card border border-slate-200 p-3" open>
      <summary className="cursor-pointer font-semibold">{t('passport.preview')}</summary>
      <p className="my-2 text-sm text-slate-700">{t('passport.previewNote')}</p>
      <PassportQuickView data={preview} />
    </details>
  );

  let body;
  if (status === 'loading') body = <div role="status" aria-label={t('common.working')} className="space-y-3"><Skeleton className="h-72" /><Skeleton className="h-12" /></div>;
  else if (status === 'error') body = <ErrorMessage onRetry={reload} retryLabel={t('common.retry')}>{t('passport.loadError')}</ErrorMessage>;
  else if (!passport) {
    body = (
      <Card as="form" onSubmit={(e) => { e.preventDefault(); run(() => create(hours, fields), 'passport.createError'); }}>
        <fieldset className="mb-4">
          <legend className="mb-2 font-semibold">{t('passport.validity')}</legend>
          {CHOICES.map(([value, key]) => (
            <label key={value} className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 text-lg hover:bg-slate-50">
              <input type="radio" name="hours" checked={hours === value} onChange={() => setHours(value)} className="h-6 w-6" />{t(key)}
            </label>
          ))}
        </fieldset>
        {Fields()}
        <Button type="submit" large full icon="qr" disabled={busy || !online}>
          {busy ? t('common.working') : t('passport.create')}
        </Button>
      </Card>
    );
  } else {
    const left = timeLeft(passport.expires_at);
    const link = passportLink(passport.token, base);
    body = (
      <div>
        {isLocalAddress(base) && <InlineNotice tone="warning" role="alert" className="mb-3 font-semibold">{t('passport.localWarn')}</InlineNotice>}
        <PassportCard name={preview ? preview.name : ''} code={preview ? preview.patient_code : ''} link={link} expiresAt={passport.expires_at} />
        <p className="mt-3 text-lg font-semibold">{t(left.key, { count: left.count })}</p>
        <p className="text-slate-700">{t('passport.shows', { fields: (passport.fields || []).map((k) => t(FIELDS.find(([f]) => f === k)[1])).join(', ') || '-' })}</p>
        <p className="text-slate-700">{log.length ? t('passport.opens', { count: log.length }) : t('passport.opensNone')}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 print:hidden">
          <Button variant="secondary" onClick={() => window.print()}>{t('passport.print')}</Button>
          <Link to={'/p/' + passport.token} className="inline-flex min-h-[44px] items-center justify-center font-semibold text-brand-800 underline">{t('passport.openPage')}</Link>
        </div>
        {rotating
          ? <div className="mt-2"><Card as="div">{Fields()}<p className="mb-2 text-sm">{t('passport.rotateHelp')}</p>
            <Button full disabled={busy || !online} onClick={() => run(async () => { await create(24, fields); setRotating(false); }, 'passport.createError')}>{t('passport.rotateYes')}</Button>
            <Button variant="ghost" full onClick={() => setRotating(false)}>{t('common.cancel')}</Button></Card></div>
          : <Button variant="secondary" full className="mt-2" onClick={() => setRotating(true)} disabled={!online}>{t('passport.rotate')}</Button>}
        {confirming
          ? <ConfirmDialog title={t('passport.revokeConfirm')} confirmLabel={t('passport.revokeYes')} busy={busy} onCancel={() => setConfirming(false)} onConfirm={() => run(revoke, 'passport.revokeError')} />
          : <Button variant="secondary" full className="mt-2" onClick={() => setConfirming(true)} disabled={!online}>{t('passport.revoke')}</Button>}
      </div>
    );
  }

  const History = () => (
    <section aria-label={t('passport.history')} className="mt-6 print:hidden">
      <h2 className="mb-1 text-lg font-bold">{t('passport.history')}</h2>
      {history.length === 0 ? <p className="text-slate-700">{t('passport.historyNone')}</p> : (
        <ul data-testid="passport-history" className="space-y-1 text-sm">
          {history.map((h, i) => (
            <li key={i}>{formatDateTime(h.at)} · {t(WHO[h.who])}{h.purpose ? ' · ' + t(PURPOSE[h.purpose]) : ''} · {t(h.outcome === 'allowed' ? 'passport.allowed' : 'passport.denied')}</li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <BackLink />
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('passport.title')}</h1>
      <p className="mb-3 text-slate-700">{t('passport.intro')}</p>
      <OfflineNote />
      {!online && passport && <InlineNotice tone="warning" role="status" className="mb-3 font-semibold">{t('passport.offlineNote')}</InlineNotice>}
      <ErrorMessage>{problem}</ErrorMessage>
      {body}
      {!passport && status === 'ready' && <div className="mt-4">{Preview()}</div>}
      {History()}
      <p className="mt-6 text-sm text-slate-600">{t('passport.sharedNote')}</p>
      <Link to="/consent" className="inline-flex min-h-[44px] items-center font-semibold text-brand-800 underline">{t('passport.consentLink')}</Link>
    </div>
  );
}
