// Footer like a hospital website: the notice, privacy, accessibility, credits and the team. Always says this is a simulated demo.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const link = 'inline-flex min-h-[44px] items-center font-semibold underline underline-offset-2 hover:no-underline';

export default function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-8 bg-ht-navy text-sm text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="font-bold">{t('footer.notice')}</p>
        <nav aria-label={t('footer.links')} className="mt-2 flex flex-wrap gap-x-6">
          <Link to="/consent" className={link}>{t('footer.privacy')}</Link>
          <Link to="/about#accessibility" className={link}>{t('footer.accessibility')}</Link>
          <Link to="/about" className={link}>{t('footer.credits')}</Link>
        </nav>
        <p className="mt-2 text-xs text-white/80">{t('footer.team')}</p>
      </div>
    </footer>
  );
}
