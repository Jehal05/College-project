// "No internet. Tell your contacts by SMS". Shown on the "Not sent yet" screen when there is no data connection.
// Each button opens the phone's messages app with the text ready; the person must press send. We never claim an SMS was sent.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import { getConsents, getContacts } from '../services/api';
import { getUseDemo, resolveLocation } from '../services/geo';
import { buildMessage, platformOf, primaryFirst, smsHref } from '../utils/smsLink';

export default function SmsFallback() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [contacts, setContacts] = useState(null); // null = loading
  const [location, setLocation] = useState(null); // only when sharing is on and a position is known

  useEffect(() => {
    let stop = false;
    getContacts(session.patient_id).then((c) => { if (!stop) setContacts(c); }).catch(() => { if (!stop) setContacts([]); });
    getConsents(session.patient_id)
      .then((r) => (r.consents.location === true ? resolveLocation(true) : null)) // unknown consent counts as off
      .then((loc) => { if (!stop && loc && (loc.source === 'gps' || getUseDemo())) setLocation(loc); })
      .catch(() => {});
    return () => { stop = true; };
  }, [session.patient_id]);

  const message = buildMessage(t('sms.body'), location);
  const platform = platformOf(navigator.userAgent);
  return (
    <section aria-labelledby="sms-title" className="mt-4 rounded-xl bg-white p-4 text-slate-900">
      <h2 id="sms-title" className="text-lg font-bold">{t('sms.title')}</h2>
      <p className="mt-1 text-sm">{t('sms.help')}</p>
      <p className="mt-2 text-sm font-semibold">{t('sms.textLabel')}</p>
      <p data-testid="sms-text" className="mb-3 rounded-xl bg-slate-100 p-2 text-sm">{message}</p>
      {contacts === null && <p role="status" className="text-sm">{t('sms.loading')}</p>}
      {contacts && contacts.length === 0 && (
        <p>{t('notified.none')} <Link to="/contacts" className="font-semibold text-brand-700 underline">{t('notified.add')}</Link></p>
      )}
      {contacts && primaryFirst(contacts).map((c) => (
        <a key={c.id} href={smsHref(c.phone, message, platform)}
          className="mb-2 flex min-h-[52px] w-full items-center justify-center rounded-xl border-2 border-brand-700 px-3 text-center font-bold text-brand-800">
          {t('sms.button', { name: c.name })}
        </a>
      ))}
      <p className="text-xs text-slate-700">{t('sms.cannotKnow')}</p>
    </section>
  );
}
