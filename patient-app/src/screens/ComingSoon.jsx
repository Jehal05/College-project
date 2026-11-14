// Placeholder for a page that is planned but not built yet. It says so plainly instead of showing fake data.
import { useTranslation } from 'react-i18next';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';

export default function ComingSoon({ page }) {
  const { t } = useTranslation();
  return (
    <div className="ht-themed text-ht-text">
      <h1 className="mb-2 text-2xl font-bold">{t('nav.' + page)}</h1>
      <Panel>
        <StatusChip tone="info" icon="clock">{t('soon.chip')}</StatusChip>
        <p className="mt-3 text-ht-muted">{t('soon.text')}</p>
      </Panel>
    </div>
  );
}
