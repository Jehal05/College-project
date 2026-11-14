// Public sign-up for volunteer responders. The account starts unverified: an admin must verify it before any alert is shown.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerResponder } from '../services/api';
import useLazyStrings from '../hooks/useLazyStrings';
import FormField from '../components/FormField';
import ErrorMessage from '../components/ErrorMessage';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { InlineNotice, Skeleton } from '../components/ui/Feedback';

const BUNDLES = { en: () => import('../i18n/responder.en.json'), hi: () => import('../i18n/responder.hi.json'), gu: () => import('../i18n/responder.gu.json') };

export default function Volunteer() {
  const { t } = useTranslation();
  const ready = useLazyStrings(BUNDLES);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!f.name.trim() || !f.email.trim() || f.password.length < 8) { setError(t('volunteer.invalid')); return; }
    setBusy(true);
    try { await registerResponder({ name: f.name.trim(), email: f.email.trim(), password: f.password }); setDone(true); }
    catch (err) { setError(t(err.status === 409 ? 'volunteer.exists' : err.status === 400 ? 'volunteer.invalid' : 'volunteer.error')); }
    setBusy(false);
  }

  if (!ready) return <div role="status" aria-label={t('common.working')}><Skeleton className="h-32 w-full" /></div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('volunteer.title')}</h1>
      <p className="text-slate-700">{t('volunteer.intro')}</p>
      {done ? <InlineNotice tone="success" role="status">{t('volunteer.done')}</InlineNotice> : (
        <Card>
          <form onSubmit={submit} noValidate>
            {error && <div className="mb-3"><ErrorMessage>{error}</ErrorMessage></div>}
            <FormField label={t('volunteer.name')} value={f.name} onChange={set('name')} autoComplete="name" required />
            <FormField label={t('volunteer.email')} type="email" value={f.email} onChange={set('email')} autoComplete="email" required />
            <FormField label={t('volunteer.password')} type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required />
            <Button type="submit" full disabled={busy}>{t('volunteer.submit')}</Button>
          </form>
        </Card>
      )}
      <Link to="/login" className="flex min-h-[44px] items-center justify-center font-semibold text-brand-900 underline">{t('volunteer.back')}</Link>
    </div>
  );
}
