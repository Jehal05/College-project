// Add or edit one emergency contact. Checks the fields before sending; shows server errors too.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RELATIONS, validateContact } from '../utils/validate';
import FormField from './FormField';
import ErrorMessage from './ErrorMessage';

// initial = an existing contact when editing, or null when adding.
export default function ContactForm({ initial, onSave, onCancel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: initial?.name || '', relation: initial?.relation || '', phone: initial?.phone || '', is_primary: Boolean(initial?.is_primary),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const set = (key) => (value) => setForm({ ...form, [key]: value });
  const e = (key) => (errors[key] ? t(errors[key]) : undefined);

  async function submit(event) {
    event.preventDefault();
    const found = validateContact(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setServerError('');
    try {
      await onSave({ ...form, name: form.name.trim(), phone: form.phone.trim() });
    } catch (err) {
      setServerError(err.status === 409 ? t('contacts.limit') : t('contacts.saveError'));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label={initial ? t('contacts.edit') : t('contacts.add')} className="mb-4 rounded-xl border border-slate-300 p-4">
      <h2 className="mb-3 text-lg font-bold">{initial ? t('contacts.edit') : t('contacts.add')}</h2>
      <FormField label={t('contacts.name')} value={form.name} onChange={set('name')} error={e('name')} autoComplete="off" />
      <FormField label={t('contacts.relation')} value={form.relation} onChange={set('relation')} error={e('relation')}
        options={RELATIONS.map((r) => ({ value: r, label: t('relation.' + r) }))} placeholder={t('contacts.relationPick')} />
      <FormField label={t('contacts.phone')} value={form.phone} onChange={set('phone')} error={e('phone')} type="tel" autoComplete="off" />
      <label className="mb-4 flex min-h-[44px] items-center gap-3">
        <input type="checkbox" className="h-6 w-6" checked={form.is_primary} onChange={(ev) => set('is_primary')(ev.target.checked)} />
        <span>{t('contacts.makePrimary')}</span>
      </label>
      {serverError && <div className="mb-3"><ErrorMessage>{serverError}</ErrorMessage></div>}
      <button type="submit" disabled={saving} className="mb-2 min-h-[48px] w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60">
        {saving ? t('common.working') : t('common.save')}
      </button>
      <button type="button" onClick={onCancel} className="min-h-[48px] w-full rounded-lg border-2 border-slate-400 font-semibold">{t('common.cancel')}</button>
    </form>
  );
}
