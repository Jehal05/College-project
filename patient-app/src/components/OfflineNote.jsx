// Small note on screens that can be read offline: the data is a saved copy and changes are turned off.
import { useTranslation } from 'react-i18next';
import useOnline from '../hooks/useOnline';

export default function OfflineNote() {
  const { t } = useTranslation();
  if (useOnline()) return null;
  return (
    <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
      {t('offline.savedCopy')} {t('offline.readOnly')}
    </p>
  );
}
