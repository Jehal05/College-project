// Title of the red emergency screen, plus a notice if the live connection is lost.
import { useTranslation } from 'react-i18next';

export default function EmergencyHeader({ type, connected }) {
  const { t } = useTranslation();
  return (
    <header className="mb-3">
      <h1 className="text-3xl font-extrabold">
        {t('emergency.title')}{type ? ': ' + t('emergencyType.' + type) : ''}
      </h1>
      {!connected && <p role="status" className="mt-1 text-sm font-semibold">{t('emergency.connectionLost')}</p>}
    </header>
  );
}
