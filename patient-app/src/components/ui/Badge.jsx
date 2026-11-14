// Data-source badges. Every screen that shows health numbers says whether they are real device data or simulated demo data.
// Icon AND text, never colour alone. In this prototype everything is simulated.
import { useTranslation } from 'react-i18next';
import Icon from '../icons';

const STYLE = {
  simulated: 'border-ht-warning/60 bg-ht-warning/10 text-ht-warning',
  real: 'border-ht-accent2/60 bg-ht-accent2/10 text-ht-accent2',
};

export function DataSourceBadge({ source = 'simulated', short = false, className = '' }) {
  const { t } = useTranslation();
  const sim = source !== 'real';
  return (
    <span className={'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ' + (sim ? STYLE.simulated : STYLE.real) + ' ' + className}>
      <Icon name={sim ? 'info' : 'check'} size={14} />
      {t(sim ? (short ? 'badge.simulatedShort' : 'badge.simulated') : (short ? 'badge.realShort' : 'badge.real'))}
    </span>
  );
}
export const SimulatedBadge = (props) => <DataSourceBadge source="simulated" {...props} />;
export const RealDataBadge = (props) => <DataSourceBadge source="real" {...props} />;
