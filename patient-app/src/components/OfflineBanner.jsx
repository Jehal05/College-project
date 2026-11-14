// Shown on every screen while offline. Calling 112 / 108 is a plain phone link, so it works without internet.
import { useTranslation } from 'react-i18next';
import useOnline from '../hooks/useOnline';
import Icon from './icons';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="mb-3 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <Icon name="alert" className="mt-0.5" />
      <div>
        <p>{t('offline.banner')}</p>
        <a href="tel:112" className="mt-1 inline-flex min-h-[44px] items-center gap-1 font-bold underline"><Icon name="phone" size={16} />{t('emergency.call')}</a>
      </div>
    </div>
  );
}
