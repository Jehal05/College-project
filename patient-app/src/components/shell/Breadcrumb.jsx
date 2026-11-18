// "Home / Page" row under the top bar, as on hospital sites. It only names the current section; the sidebar does the navigating.
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV } from '../../config/navigation';

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const item = NAV.find((n) => pathname === n.to || pathname.startsWith(n.to + '/'));
  const label = item ? t('nav.' + item.key) : pathname === '/about' ? t('about.title') : null;
  if (!label || pathname === '/') return null;
  return (
    <nav aria-label={t('crumb.label')} className="mb-4 text-sm text-ht-muted">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link to="/" className="font-semibold text-ht-accent underline">{t('crumb.home')}</Link></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-semibold text-ht-text">{label}</li>
      </ol>
    </nav>
  );
}
