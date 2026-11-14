// Left navigation of the desktop layout (1024 px and wider). Not rendered on phones, where the bottom bar is used.
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon, { LogoMark } from '../icons';
import { NAV } from '../../config/navigation';

export default function Sidebar() {
  const { t } = useTranslation();
  const link = ({ isActive }) =>
    'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-ht ' +
    (isActive ? 'bg-ht-accent/15 text-ht-accent' : 'text-ht-muted hover:bg-ht-card hover:text-ht-text');
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-ht-line bg-ht-sidebar p-4">
      <div className="mb-6 flex items-center gap-2 px-1">
        <LogoMark size={36} />
        <p className="text-lg font-extrabold tracking-tight text-ht-text">{t('app.title')}</p>
      </div>
      <nav aria-label={t('nav.sidebar')} className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((n) => (
          <NavLink key={n.key} to={n.to} end={n.end} className={link}>
            <Icon name={n.icon} size={20} /><span>{t('nav.' + n.key)}</span>
          </NavLink>
        ))}
      </nav>
      <p className="mt-4 px-1 text-xs text-ht-muted">{t('nav.notDevice')}</p>
    </aside>
  );
}
