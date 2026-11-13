// The last 5 alerts, each opening its summary. Fetched from the server; nothing is kept in the browser.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../hooks/useAuth';
import { getEmergencies } from '../services/api';
import { formatDateTime } from '../utils/time';

export default function PastAlerts() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [list, setList] = useState(null);
  useEffect(() => { getEmergencies(session.patient_id).then(setList).catch(() => setList([])); }, [session.patient_id]);
  if (!list) return null;
  return (
    <section aria-labelledby="past-title" className="mb-5">
      <h2 id="past-title" className="mb-2 text-lg font-bold">{t('past.title')}</h2>
      {list.length === 0 && <p className="text-sm text-slate-700">{t('past.none')}</p>}
      <ul className="grid gap-2">
        {list.slice(0, 5).map((e) => (
          <li key={e.id}>
            <Link to={'/summary/' + e.id} className="flex min-h-[48px] items-center justify-between rounded-lg border border-slate-300 px-4 font-semibold text-blue-800">
              <span>{formatDateTime(e.started_at)} · {t('emergencyType.' + e.type)} · {t('state.' + e.final_state)}</span><span aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
