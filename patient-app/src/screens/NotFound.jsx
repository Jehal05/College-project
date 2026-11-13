// Shown for any address that does not exist.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('notfound.title')}</h1>
      <Link to="/" className="inline-flex min-h-[44px] items-center rounded-lg bg-blue-700 px-4 font-semibold text-white">{t('notfound.back')}</Link>
    </div>
  );
}
