// Edit the list of emergency contacts: name, relation and phone, with add and remove.
import { useTranslation } from 'react-i18next';
import FormField from './FormField';

export default function ContactsEditor({ contacts, onChange, errors = [] }) {
  const { t } = useTranslation();
  const err = (i, key) => (errors[i] && errors[i][key] ? t(errors[i][key]) : undefined);
  const update = (i, key, value) => onChange(contacts.map((c, n) => (n === i ? { ...c, [key]: value } : c)));
  const remove = (i) => onChange(contacts.filter((_, n) => n !== i).map((c, n) => ({ ...c, priority: n + 1 })));
  const add = () => onChange([...contacts, { id: 'c' + Date.now(), name: '', relation: '', phone: '', priority: contacts.length + 1 }]);

  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-lg font-bold">{t('profile.contacts')}</legend>
      {contacts.length === 0 && <p className="mb-2 text-sm text-slate-600">{t('profile.noContacts')}</p>}
      {contacts.map((c, i) => (
        <div key={c.id} className="mb-3 rounded-lg border border-slate-200 p-3">
          <FormField label={t('profile.contactName')} value={c.name} error={err(i, 'name')} onChange={(v) => update(i, 'name', v)} autoComplete="off" />
          <FormField label={t('profile.contactRelation')} value={c.relation} onChange={(v) => update(i, 'relation', v)} />
          <FormField label={t('profile.contactPhone')} value={c.phone} type="tel" error={err(i, 'phone')} onChange={(v) => update(i, 'phone', v)} />
          <button type="button" onClick={() => remove(i)} className="min-h-[44px] rounded-lg bg-slate-200 px-4 font-semibold">
            {t('profile.removeContact', { n: i + 1 })}
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="min-h-[44px] rounded-lg bg-slate-200 px-4 font-semibold">{t('profile.addContact')}</button>
    </fieldset>
  );
}
