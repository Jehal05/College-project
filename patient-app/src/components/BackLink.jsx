// "Back" link with a chevron, shown at the top of sub-screens.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from './icons';

export default function BackLink({ to = '/profile' }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className="mb-2 -ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 font-semibold text-brand-800 hover:bg-brand-50">
      <Icon name="chevron" className="rotate-180" size={18} />{t('common.back')}
    </Link>
  );
}
