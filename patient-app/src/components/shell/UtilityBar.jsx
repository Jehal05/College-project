// Thin bar above every signed-in page, like a hospital website: emergency numbers (plain tel: links that work with no app logic)
// and a reminder that this is a simulated demo.
import { useTranslation } from 'react-i18next';

const link = 'inline-flex min-h-[44px] items-center font-bold underline underline-offset-2 hover:no-underline';

export default function UtilityBar() {
  const { t } = useTranslation();
  return (
    <div role="region" aria-label={t('util.label')} className="bg-ht-navy text-xs text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-0">
        <p className="flex flex-wrap items-center gap-x-3">
          <span className="font-semibold">{t('util.emergency')}</span>
          <a className={link} href="tel:112">{t('util.call112')}</a>
          <a className={link} href="tel:108">{t('util.call108')}</a>
        </p>
        <p className="font-semibold uppercase tracking-wide">{t('util.demo')}</p>
      </div>
    </div>
  );
}
