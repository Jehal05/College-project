// Emergency contacts: list, add, edit, make primary and delete (with an in-page confirm). At most 5.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import useContacts from '../hooks/useContacts';
import ContactsEditor from '../components/ContactsEditor';
import ContactForm from '../components/ContactForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorMessage from '../components/ErrorMessage';
import OfflineNote from '../components/OfflineNote';
import useOnline from '../hooks/useOnline';
import Button from '../components/ui/Button';
import Icon from '../components/icons';
import { Skeleton } from '../components/ui/Feedback';

const MAX_CONTACTS = 5;

export default function Contacts() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { contacts, status, load, add, update, remove } = useContacts(session.patient_id);
  const online = useOnline();
  const [form, setForm] = useState(null); // null | 'new' | a contact being edited
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const full = contacts.length >= MAX_CONTACTS;
  const save = async (values) => {
    if (form === 'new') await add(values); else await update(form.id, values);
    setForm(null);
  };
  const makePrimary = (c) => update(c.id, { ...c, is_primary: true }).catch(() => setProblem(t('contacts.saveError')));
  const confirmDelete = async () => {
    setBusy(true);
    try { await remove(deleting.id); setDeleting(null); } catch { setProblem(t('contacts.deleteError')); }
    setBusy(false);
  };

  return (
    <div>
      <Link to="/profile" className="mb-2 inline-flex min-h-[44px] items-center gap-1 font-semibold text-brand-800 underline"><Icon name="chevron" className="rotate-180" size={18} />{t('common.back')}</Link>
      <h1 className="mb-1 text-2xl font-extrabold">{t('contacts.title')}</h1>
      <p className="mb-4 text-slate-700">{t('contacts.intro')}</p>
      <OfflineNote />

      {status === 'loading' && <div role="status" className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><span className="sr-only">{t('contacts.loading')}</span></div>}
      {status === 'error' && <ErrorMessage onRetry={load} retryLabel={t('common.retry')}>{t('contacts.loadError')}</ErrorMessage>}
      {problem && <div className="mb-3"><ErrorMessage>{problem}</ErrorMessage></div>}
      {status === 'ready' && (
        <>
          <ContactsEditor contacts={contacts} onEdit={(c) => { setProblem(''); setForm(c); }} onDelete={(c) => { setProblem(''); setDeleting(c); }} onPrimary={makePrimary} disabled={!online} />
          {deleting && <ConfirmDialog title={t('contacts.confirmDelete', { name: deleting.name })} confirmLabel={t('contacts.confirmYes')}
            onConfirm={confirmDelete} onCancel={() => setDeleting(null)} busy={busy} />}
          {form && <ContactForm key={form === 'new' ? 'new' : form.id} initial={form === 'new' ? null : form} onSave={save} onCancel={() => setForm(null)} />}
          {!form && (
            <>
              <Button full large icon="plus" disabled={full || !online} onClick={() => { setProblem(''); setForm('new'); }}>{t('contacts.add')}</Button>
              {full && <p role="status" className="mt-2 text-sm text-slate-700">{t('contacts.limit')}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
