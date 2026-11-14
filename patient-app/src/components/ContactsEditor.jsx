// The list of emergency contacts with Edit, Make primary and Delete buttons.
// (Adding and editing happens in ContactForm; this component only lists and reports clicks.)
import { useTranslation } from 'react-i18next';
import { Avatar } from './ui/Card';
import { Chip, EmptyState } from './ui/Feedback';
import Icon from './icons';

const small = 'min-h-[44px] rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 disabled:opacity-60';

export default function ContactsEditor({ contacts, onEdit, onDelete, onPrimary, disabled = false }) {
  const { t } = useTranslation();
  if (contacts.length === 0) return <div className="mb-3"><EmptyState icon="users">{t('contacts.empty')}</EmptyState></div>;
  return (
    <ul className="mb-3">
      {contacts.map((c) => (
        <li key={c.id} className="mb-3 rounded-card border border-slate-200 bg-white p-3 shadow-card">
          <div className="flex items-start gap-3">
            <Avatar name={c.name} />
            <div className="min-w-0 flex-1">
              <p className="break-words text-lg font-bold">{c.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Chip>{t('relation.' + c.relation, { defaultValue: c.relation })}</Chip>
                {c.is_primary && <Chip tone="brand" icon="check">{t('contacts.primary')}</Chip>}
              </div>
              <a href={'tel:' + c.phone.replace(/[\s-]/g, '')} className="num mt-1 inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-800 underline"><Icon name="phone" size={16} />{c.phone}</a>
            </div>
          </div>
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
