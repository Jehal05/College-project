// Shown on every screen while offline. Calling 112 / 108 is a plain phone link, so it works without internet.
import { useTranslation } from 'react-i18next';
import useOnline from '../hooks/useOnline';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="mb-3 rounded-lg border border-amber-400 bg-amber-100 px-3 py-2 text-center text-sm text-amber-900">
      <p>{t('offline.banner')}</p>
      <a href="tel:112" className="mt-1 inline-flex min-h-[44px] items-center font-bold underline">{t('emergency.call')}</a>
    </div>
  );
}
