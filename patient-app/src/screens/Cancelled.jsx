// Shown after the user cancels a false alarm.
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Cancelled() {
  const { t } = useTranslation();
  const id = useLocation().state?.id; // the alert that was cancelled, so its record can be opened
  return (
    <div role="status">
      <h1 className="mb-2 text-2xl font-bold text-green-800">{t('cancelled.title')}</h1>
      <p className="mb-4">{t('cancelled.text')}</p>
      {id && (
        <Link to={'/summary/' + id} className="mb-3 flex min-h-[48px] items-center justify-center rounded-lg border-2 border-blue-700 px-4 font-bold text-blue-800">
          {t('emergency.viewSummary')}
        </Link>
      )}
      <Link to="/" className="inline-flex min-h-[48px] items-center rounded-lg bg-blue-700 px-4 font-bold text-white">
        {t('cancelled.home')}
      </Link>
    </div>
  );
}
