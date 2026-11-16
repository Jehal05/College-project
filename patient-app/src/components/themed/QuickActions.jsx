// Four big shortcuts, like the "Find a doctor / Book / Records" cards on hospital sites.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '../icons';

const ACTIONS = [['emergency', '/emergency-center', 'alert'], ['records', '/report-intelligence', 'file'], ['circle', '/care-circle', 'users'], ['simulator', '/simulator', 'bolt']];

export default function QuickActions() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="qa-title">
      <h2 id="qa-title" className="sr-only">{t('qa.title')}</h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTIONS.map(([k, to, icon]) => (
          <li key={k}>
            <Link to={to} className="flex h-full min-h-[96px] flex-col gap-1 rounded-2xl border border-ht-line bg-ht-card p-4 text-ht-text shadow-card transition-colors duration-ht hover:border-ht-accent">
              <span className="flex items-center gap-2 font-bold text-ht-accent"><Icon name={icon} size={20} />{t('qa.' + k)}</span>
              <span className="text-sm text-ht-muted">{t('qa.' + k + 'Hint')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
