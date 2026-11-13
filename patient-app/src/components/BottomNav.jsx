// Bottom navigation with large touch targets (at least 44 px high).
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();
  const link = ({ isActive }) =>
    'flex min-h-[56px] flex-1 items-center justify-center text-base font-semibold ' +
    (isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600');
  return (
    <nav aria-label={t('nav.label')} className="sticky bottom-0 z-20 flex border-t border-slate-200 bg-white">
      <NavLink to="/" end className={link}>{t('nav.home')}</NavLink>
      <NavLink to="/profile" className={link}>{t('nav.profile')}</NavLink>
    </nav>
  );
}
