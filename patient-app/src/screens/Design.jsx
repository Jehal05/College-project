// Developer-only page that shows every design-system piece in both themes. Only exists in `npm run dev` or demo builds.
import { useTranslation } from 'react-i18next';
import Panel from '../components/ui/Panel';
import StatusChip from '../components/ui/StatusChip';
import { DataSourceBadge } from '../components/ui/Badge';
import useTheme from '../hooks/useTheme';

const SWATCHES = ['bg', 'sidebar', 'card', 'line', 'accent', 'accent2', 'warning', 'emergency', 'text', 'muted'];

export default function Design() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  return (
    <div className="ht-themed space-y-6 text-ht-text">
      <h1 className="text-2xl font-bold">{t('design.title')}</h1>
      <p className="text-ht-muted">{t('design.intro')}</p>
      <button type="button" onClick={toggle} className="min-h-[44px] rounded-xl bg-ht-accent px-4 font-bold text-ht-onaccent">{t('design.toggle', { theme })}</button>

      <Panel aria-labelledby="d-colors"><h2 id="d-colors" className="mb-3 text-lg font-bold">{t('design.colors')}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SWATCHES.map((n) => (
            <li key={n} className="text-sm"><span className="block h-12 rounded-xl border border-ht-line" style={{ backgroundColor: 'rgb(var(--ht-' + n + '))' }} /><span className="mt-1 block font-semibold">{n}</span></li>
          ))}
        </ul>
      </Panel>

      <Panel aria-labelledby="d-badges"><h2 id="d-badges" className="mb-3 text-lg font-bold">{t('design.badges')}</h2>
        <div className="flex flex-wrap gap-2">
          <DataSourceBadge source="simulated" /><DataSourceBadge source="real" /><DataSourceBadge source="simulated" short /><DataSourceBadge source="real" short />
        </div>
      </Panel>

      <Panel aria-labelledby="d-chips"><h2 id="d-chips" className="mb-3 text-lg font-bold">{t('design.chips')}</h2>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="ok">{t('design.chipOk')}</StatusChip><StatusChip tone="info">{t('design.chipInfo')}</StatusChip>
          <StatusChip tone="caution">{t('design.chipCaution')}</StatusChip><StatusChip tone="emergency">{t('design.chipEmergency')}</StatusChip>
          <StatusChip tone="neutral">{t('design.chipNeutral')}</StatusChip>
        </div>
      </Panel>

      <Panel glow aria-labelledby="d-glow"><h2 id="d-glow" className="text-lg font-bold">{t('design.glow')}</h2><p className="text-ht-muted">{t('design.glowText')}</p></Panel>
    </div>
  );
}
