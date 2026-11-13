// Shows which contacts were told about the emergency (simulated). Appears only after the
// "contacts.notified" event arrives, or says there are no contacts when the patient has none.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import { getContacts } from '../services/api';
import Icon from './icons';

export default function ContactsNotified({ emergency }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const notified = emergency.contacts_notified;
  const [count, setCount] = useState(null); // number of saved contacts, only fetched while nothing was notified

  useEffect(() => {
    if (notified) return;
    getContacts(session.patient_id).then((list) => setCount(list.length)).catch(() => setCount(null));
  }, [notified, session.patient_id]);

  if (notified) {
    return (
      <section aria-label={t('notified.title')} className="mt-4 rounded-card bg-white p-4 text-slate-900 shadow-lift">
        <p role="status" className="flex items-center gap-2 font-bold"><Icon name="users" className="text-brand-700" />{t('notified.done')}</p>
        <p className="text-sm text-slate-700">{notified.map((c) => c.name + ' (' + t('relation.' + c.relation, { defaultValue: c.relation }) + ')').join(', ')}</p>
      </section>
    );
  }
  if (count === 0) {
    return (
      <section aria-label={t('notified.title')} className="mt-4 rounded-card bg-white p-4 text-slate-900 shadow-lift">
        <p>{t('notified.none')} <Link to="/contacts" className="font-semibold text-brand-700 underline">{t('notified.add')}</Link></p>
      </section>
    );
  }
  return null;
}
