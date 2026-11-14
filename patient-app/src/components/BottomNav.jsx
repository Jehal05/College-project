// Bottom navigation of the phone layout: Home, Twin, Monitor, Reports, Profile. Icon + label, 56 px targets, room for the home bar.
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './icons';
import { BOTTOM, BOTTOM_TO, NAV } from '../config/navigation';

// Short names for the narrow bar; the sidebar uses the long ones.
const LABEL = { overview: 'nav.home', twin: 'nav.short.twin', monitor: 'nav.short.monitor', reports: 'nav.short.reports', settings: 'nav.profile' };

export default function BottomNav() {
  const { t } = useTranslation();
  const link = ({ isActive }) =>
    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold ' +
    (isActive ? 'border-t-4 border-brand-700 bg-brand-50 text-brand-800' : 'border-t-4 border-transparent text-slate-600');
  return (
    <nav aria-label={t('nav.label')} className="safe-bottom sticky bottom-0 z-20 flex border-t border-slate-200 bg-white shadow-lift">
      {BOTTOM.map((key) => {
        const n = NAV.find((x) => x.key === key);
        return <NavLink key={key} to={BOTTOM_TO[key] || n.to} end={key === 'overview'} className={link}><Icon name={n.icon} /><span>{t(LABEL[key] || 'nav.' + key)}</span></NavLink>;
      })}
    </nav>
  );
}
