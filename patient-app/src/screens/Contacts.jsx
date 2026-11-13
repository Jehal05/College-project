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
      <Link to="/profile" className="mb-2 inline-flex min-h-[44px] items-center font-semibold text-blue-700 underline">{t('common.back')}</Link>
      <h1 className="mb-1 text-2xl font-bold">{t('contacts.title')}</h1>
      <p className="mb-4 text-slate-700">{t('contacts.intro')}</p>
      <OfflineNote />

      {status === 'loading' && <p role="status">{t('contacts.loading')}</p>}
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
              <button type="button" disabled={full || !online} onClick={() => { setProblem(''); setForm('new'); }}
                className="min-h-[48px] w-full rounded-lg bg-blue-700 font-bold text-white disabled:opacity-60">{t('contacts.add')}</button>
              {full && <p role="status" className="mt-2 text-sm text-slate-700">{t('contacts.limit')}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
