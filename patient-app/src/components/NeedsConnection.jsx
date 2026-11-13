// Shown instead of a server-only screen (passport, reminders, summary) when its code could not be loaded because there is
// no internet and the screen was never opened before. The Call 112 / 108 link is plain HTML and always works.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NeedsConnection() {
  const { t } = useTranslation();
  return (
    <div role="status">
      <p className="mb-4">{t('screen.needsConnection')}</p>
      <a href="tel:112" className="mb-3 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-red-700 text-lg font-bold text-white">{t('emergency.call')}</a>
      <Link to="/" className="inline-flex min-h-[48px] items-center rounded-lg bg-blue-700 px-4 font-bold text-white">{t('cancelled.home')}</Link>
    </div>
  );
}
