// Feature 1: view, edit and save the patient profile (GET then PATCH).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import { getPatient, updatePatient } from '../services/api';
import { BLOOD_GROUPS, validateProfile, toList, fromList } from '../utils/validate';
import FormField from '../components/FormField';
import ErrorMessage from '../components/ErrorMessage';
import LanguageSelect from '../components/LanguageSelect';
import OfflineNote from '../components/OfflineNote';
import useOnline from '../hooks/useOnline';
import CheckInSetting from '../components/CheckInSetting';
import PastAlerts from '../components/PastAlerts';
import Button from '../components/ui/Button';
import Card, { Avatar, ListRow } from '../components/ui/Card';
import { Chip, InlineNotice, Skeleton } from '../components/ui/Feedback';

const LINKS = [['/consent', 'profile.consent', 'shield'], ['/access', 'profile.access', 'shield'], ['/contacts', 'profile.contacts', 'users'], ['/reports', 'profile.reports', 'file'], ['/reminders', 'profile.reminders', 'pill'], ['/passport', 'profile.passport', 'qr']];

// Turn the patient from the API into plain strings the form can edit.
const toForm = (p) => ({
  name: p.name, age: String(p.age), blood_group: p.blood_group,
  allergies: fromList(p.allergies), conditions: fromList(p.conditions), medications: fromList(p.medications),
});

export default function Profile() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const online = useOnline();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('loading'); // loading | ready | loadError
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = useCallback(() => {
    setStatus('loading');
    getPatient(session.patient_id)
      .then((p) => { setForm(toForm(p)); setStatus('ready'); })
      .catch(() => setStatus('loadError')); // a 401 signs out by itself (auth.js)
  }, [session.patient_id]);

  useEffect(load, [load]);

  const set = (key) => (value) => { setForm({ ...form, [key]: value }); setMessage({ type: '', text: '' }); };

  async function save(e) {
    e.preventDefault();
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await updatePatient(session.patient_id, {
        name: form.name.trim(), age: Number(form.age), blood_group: form.blood_group,
        allergies: toList(form.allergies), conditions: toList(form.conditions),
        medications: toList(form.medications),
      });
      setMessage({ type: 'ok', text: t('profile.saved') });
    } catch {
      setMessage({ type: 'error', text: t('profile.error') });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <div role="status" className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /><span className="sr-only">{t('profile.loading')}</span></div>;
  if (status === 'loadError') return <ErrorMessage onRetry={load} retryLabel={t('profile.retry')}>{t('profile.loadError')}</ErrorMessage>;

  const e = (key) => (errors[key] ? t(errors[key]) : undefined);
  return (
    <form onSubmit={save} noValidate>
      <h1 className="mb-3 text-2xl font-extrabold">{t('profile.title')}</h1>
      <Card className="mb-4 flex items-center gap-4">
        <Avatar name={form.name} size={64} />
        <div className="min-w-0">
          <p className="break-words text-xl font-extrabold">{form.name}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {form.age && <Chip>{form.age}</Chip>}
            {form.blood_group && <Chip tone="brand" icon="drop">{form.blood_group}</Chip>}
          </div>
        </div>
      </Card>
      <LanguageSelect />
      <OfflineNote />
      <Card as="nav" aria-label={t('profile.links')} className="mb-5 !p-1">
        {LINKS.map(([to, key, icon]) => <ListRow key={to} to={to} icon={icon} title={t(key)} />)}
      </Card>
      <CheckInSetting />
      <PastAlerts />
      <Card as="div" className="mb-4"><fieldset disabled={!online} className="contents">
      <FormField label={t('profile.name')} value={form.name} onChange={set('name')} error={e('name')} autoComplete="name" />
      <FormField label={t('profile.age')} value={form.age} onChange={set('age')} error={e('age')} type="number" inputMode="numeric" min="0" max="120" />
      <FormField label={t('profile.bloodGroup')} value={form.blood_group} onChange={set('blood_group')} error={e('blood_group')}
        options={BLOOD_GROUPS} placeholder={t('profile.bloodGroupPick')} />
      <FormField label={t('profile.allergies')} value={form.allergies} onChange={set('allergies')} />
      <FormField label={t('profile.conditions')} value={form.conditions} onChange={set('conditions')} />
      <FormField label={t('profile.medications')} value={form.medications} onChange={set('medications')} />
      </fieldset></Card>
      {message.type === 'ok' && <div className="mb-3"><InlineNotice tone="success" role="status">{message.text}</InlineNotice></div>}
      {message.type === 'error' && <div className="mb-3"><ErrorMessage>{message.text}</ErrorMessage></div>}
      <Button type="submit" full large icon="check" disabled={saving || !online}>{saving ? t('profile.saving') : t('profile.save')}</Button>
    </form>
  );
}
