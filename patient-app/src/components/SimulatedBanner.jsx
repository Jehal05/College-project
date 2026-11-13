// Banner shown on every screen: this is a simulation, not a diagnosis.
import { useTranslation } from 'react-i18next';

export default function SimulatedBanner() {
  const { t } = useTranslation();
  return (
    <div role="note" className="sticky top-0 z-20 bg-slate-800 px-3 py-2 text-center text-sm font-medium text-white">
      {t('banner.simulated')}
    </div>
  );
}
