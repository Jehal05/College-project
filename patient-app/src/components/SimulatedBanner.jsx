// Banner shown on every screen: this is a simulation, not a diagnosis.
import { useTranslation } from 'react-i18next';
import Icon from './icons';

export default function SimulatedBanner() {
  const { t } = useTranslation();
  return (
    <aside className="sticky top-0 z-20 flex items-center justify-center gap-2 bg-slate-800 px-3 py-2 text-center text-sm font-medium text-white">
      <Icon name="info" size={16} />{t('banner.simulated')}
    </aside>
  );
}
