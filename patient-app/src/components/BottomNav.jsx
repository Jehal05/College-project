// Bottom navigation: icon + label, large touch targets (56 px), clear active state, room for the phone's home bar.
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './icons';

export default function BottomNav() {
  const { t } = useTranslation();
  const link = ({ isActive }) =>
    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-sm font-semibold ' +
    (isActive ? 'border-t-4 border-brand-700 bg-brand-50 text-brand-800' : 'border-t-4 border-transparent text-slate-600');
  return (
    <nav aria-label={t('nav.label')} className="safe-bottom sticky bottom-0 z-20 flex border-t border-slate-200 bg-white shadow-lift">
      <NavLink to="/" end className={link}><Icon name="home" /><span>{t('nav.home')}</span></NavLink>
      <NavLink to="/profile" className={link}><Icon name="user" /><span>{t('nav.profile')}</span></NavLink>
    </nav>
  );
}
