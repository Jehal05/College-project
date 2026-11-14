// Patient side of family sharing: create a short code a relative types in. The code is valid for 24 hours.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFamilyInvite } from '../services/api';
import Button from './ui/Button';
import Card, { SectionHeader } from './ui/Card';
import ErrorMessage from './ErrorMessage';

export default function FamilyInvite({ patientId, disabled }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true); setError('');
    try { setCode((await createFamilyInvite(patientId)).code); } catch { setError(t('invite.error')); }
    setBusy(false);
  }
  return (
    <section aria-labelledby="invite-title">
      <SectionHeader as="h2"><span id="invite-title">{t('invite.title')}</span></SectionHeader>
      <Card>
        <p className="mb-3 text-slate-700">{t('invite.help')}</p>
        {error && <div className="mb-3"><ErrorMessage>{error}</ErrorMessage></div>}
        {code && (
          <div role="status" className="mb-3 rounded-xl bg-brand-50 p-3 text-center">
            <p className="text-3xl font-extrabold tracking-widest text-brand-900" data-testid="invite-code">{code}</p>
            <p className="text-sm text-slate-700">{t('invite.valid')}</p>
          </div>
        )}
        <Button full icon="plus" disabled={disabled || busy} onClick={create}>{t('invite.create')}</Button>
      </Card>
    </section>
  );
}
