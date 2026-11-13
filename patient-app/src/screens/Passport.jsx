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
import { passportLink } from '../config/env';
import { timeLeft } from '../utils/passportTime';
import { formatDateTime } from '../utils/time';
import PassportQr from '../components/PassportQr';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import OfflineNote from '../components/OfflineNote';

const CHOICES = [[1, 'passport.hours1'], [24, 'passport.hours24'], [168, 'passport.days7']];

export default function Passport() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const online = useOnline();
  const { status, passport, log, create, revoke, reload } = usePassport(session.patient_id);
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

  let body;
  if (status === 'loading') body = <div role="status" aria-label={t('common.working')} className="space-y-3"><Skeleton className="h-72" /><Skeleton className="h-12" /></div>;
  else if (status === 'error') body = <ErrorMessage onRetry={reload} retryLabel={t('common.retry')}>{t('passport.loadError')}</ErrorMessage>;
  else if (!passport) {
    body = (
      <Card as="form" onSubmit={(e) => { e.preventDefault(); run(() => create(hours), 'passport.createError'); }}>
        <fieldset className="mb-4">
          <legend className="mb-2 font-semibold">{t('passport.validity')}</legend>
          {CHOICES.map(([value, key]) => (
            <label key={value} className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 text-lg hover:bg-slate-50">
              <input type="radio" name="hours" checked={hours === value} onChange={() => setHours(value)} className="h-6 w-6" />{t(key)}
            </label>
          ))}
        </fieldset>
        <Button type="submit" large full icon="qr" disabled={busy || !online}>
          {busy ? t('common.working') : t('passport.create')}
        </Button>
      </Card>
    );
  } else {
    const left = timeLeft(passport.expires_at);
    body = (
      <div>
        <PassportQr link={passportLink(passport.token)} />
        <p className="mt-3 text-lg font-semibold">{t(left.key, { count: left.count })}</p>
        <p className="text-slate-700">{log.length ? t('passport.opens', { count: log.length }) : t('passport.opensNone')}</p>
        {log.length > 0 && <ul className="mb-2 list-disc pl-6 text-sm text-slate-700">{log.map((l, i) => <li key={i}>{formatDateTime(l.opened_at)}</li>)}</ul>}
        <Link to={'/p/' + passport.token} className="my-2 inline-flex min-h-[44px] items-center font-semibold text-brand-800 underline">{t('passport.openPage')}</Link>
        {confirming
          ? <ConfirmDialog title={t('passport.revokeConfirm')} confirmLabel={t('passport.revokeYes')} busy={busy} onCancel={() => setConfirming(false)} onConfirm={() => run(revoke, 'passport.revokeError')} />
          : <Button variant="secondary" full className="mt-2" onClick={() => setConfirming(true)} disabled={!online}>{t('passport.revoke')}</Button>}
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('passport.title')}</h1>
      <p className="mb-3 text-slate-700">{t('passport.intro')}</p>
      <OfflineNote />
      {!online && passport && <InlineNotice tone="warning" role="status" className="mb-3 font-semibold">{t('passport.offlineNote')}</InlineNotice>}
      <ErrorMessage>{problem}</ErrorMessage>
      {body}
      <p className="mt-6 text-sm text-slate-600">{t('passport.sharedNote')}</p>
      <Link to="/consent" className="inline-flex min-h-[44px] items-center font-semibold text-brand-800 underline">{t('passport.consentLink')}</Link>
    </div>
  );
}
