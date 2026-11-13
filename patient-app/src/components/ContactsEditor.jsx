// The list of emergency contacts with Edit, Make primary and Delete buttons.
// (Adding and editing happens in ContactForm; this component only lists and reports clicks.)
import { useTranslation } from 'react-i18next';

const small = 'min-h-[44px] rounded-lg bg-slate-200 px-3 font-semibold disabled:opacity-60';

export default function ContactsEditor({ contacts, onEdit, onDelete, onPrimary, disabled = false }) {
  const { t } = useTranslation();
  if (contacts.length === 0) return <p className="mb-3 text-slate-700">{t('contacts.empty')}</p>;
  return (
    <ul className="mb-3">
      {contacts.map((c) => (
        <li key={c.id} className="mb-3 rounded-xl border border-slate-200 p-3">
          <p className="text-lg font-bold">
            {c.name}
            {c.is_primary && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-sm text-blue-900">{t('contacts.primary')}</span>}
          </p>
          <p className="text-sm text-slate-700">{t('relation.' + c.relation, { defaultValue: c.relation })} · <a href={'tel:' + c.phone.replace(/[\s-]/g, '')} className="inline-flex min-h-[44px] items-center underline">{c.phone}</a></p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={disabled} className={small} onClick={() => onEdit(c)} aria-label={t('contacts.editFor', { name: c.name })}>{t('common.edit')}</button>
            {!c.is_primary && (
              <button type="button" disabled={disabled} className={small} onClick={() => onPrimary(c)} aria-label={t('contacts.primaryFor', { name: c.name })}>{t('contacts.makePrimaryShort')}</button>
            )}
            <button type="button" disabled={disabled} className={small} onClick={() => onDelete(c)} aria-label={t('contacts.deleteFor', { name: c.name })}>{t('common.delete')}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
