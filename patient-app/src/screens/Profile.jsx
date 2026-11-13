// Feature 1: view, edit and save the patient profile (GET then PATCH).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import { getPatient, updatePatient } from '../services/api';
import { BLOOD_GROUPS, validateProfile, toList, fromList } from '../utils/validate';
import FormField from '../components/FormField';
import ContactsEditor from '../components/ContactsEditor';
import ErrorMessage from '../components/ErrorMessage';

// Turn the patient from the API into plain strings the form can edit.
const toForm = (p) => ({
  name: p.name, age: String(p.age), blood_group: p.blood_group,
  allergies: fromList(p.allergies), conditions: fromList(p.conditions),
  medications: fromList(p.medications), contacts: p.contacts,
});

export default function Profile() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('loading'); // loading | ready | loadError
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = useCallback(() => {
    setStatus('loading');
    getPatient(session.patient_id)
      .then((p) => { setForm(toForm(p)); setStatus('ready'); })
      .catch((err) => { if (err.status === 401) signOut(); else setStatus('loadError'); });
  }, [session.patient_id, signOut]);

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
        medications: toList(form.medications), contacts: form.contacts,
      });
      setMessage({ type: 'ok', text: t('profile.saved') });
    } catch {
      setMessage({ type: 'error', text: t('profile.error') });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <p role="status">{t('profile.loading')}</p>;
  if (status === 'loadError') return <ErrorMessage onRetry={load} retryLabel={t('profile.retry')}>{t('profile.loadError')}</ErrorMessage>;

  const e = (key) => (errors[key] ? t(errors[key]) : undefined);
  return (
    <form onSubmit={save} noValidate>
      <h1 className="mb-4 text-2xl font-bold">{t('profile.title')}</h1>
      <FormField label={t('profile.name')} value={form.name} onChange={set('name')} error={e('name')} autoComplete="name" />
      <FormField label={t('profile.age')} value={form.age} onChange={set('age')} error={e('age')} type="number" inputMode="numeric" min="0" max="120" />
      <FormField label={t('profile.bloodGroup')} value={form.blood_group} onChange={set('blood_group')} error={e('blood_group')}
        options={BLOOD_GROUPS} placeholder={t('profile.bloodGroupPick')} />
      <FormField label={t('profile.allergies')} value={form.allergies} onChange={set('allergies')} />
      <FormField label={t('profile.conditions')} value={form.conditions} onChange={set('conditions')} />
      <FormField label={t('profile.medications')} value={form.medications} onChange={set('medications')} />
      <ContactsEditor contacts={form.contacts} onChange={set('contacts')} errors={errors.contacts} />
      {message.type === 'ok' && <p role="status" className="mb-3 rounded-lg bg-green-100 p-3 font-semibold text-green-800">{message.text}</p>}
      {message.type === 'error' && <div className="mb-3"><ErrorMessage>{message.text}</ErrorMessage></div>}
      <button type="submit" disabled={saving} className="min-h-[48px] w-full rounded-lg bg-blue-700 px-4 text-lg font-bold text-white disabled:opacity-60">
        {saving ? t('profile.saving') : t('profile.save')}
      </button>
    </form>
  );
}
