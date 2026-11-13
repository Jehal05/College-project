// Shown after the user cancels a false alarm.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Cancelled() {
  const { t } = useTranslation();
  return (
    <div role="status">
      <h1 className="mb-2 text-2xl font-bold text-green-800">{t('cancelled.title')}</h1>
      <p className="mb-4">{t('cancelled.text')}</p>
      <Link to="/" className="inline-flex min-h-[48px] items-center rounded-lg bg-blue-700 px-4 font-bold text-white">
        {t('cancelled.home')}
      </Link>
    </div>
  );
}
