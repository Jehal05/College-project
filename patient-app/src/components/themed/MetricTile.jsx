// One big number with a label, unit and short note. Icon + text carry the state, not colour alone.
import Icon from '../icons';
import StatusChip from '../ui/StatusChip';

export default function MetricTile({ icon, label, value, unit, note, within }) {
  return (
    <div className="rounded-2xl border border-ht-line bg-ht-card p-4 text-ht-text">
      <p className="flex items-center gap-2 text-sm font-semibold text-ht-muted"><Icon name={icon} size={18} />{label}</p>
      <p className="num mt-2 text-4xl font-extrabold">{value ?? '--'}<span className="ml-1 text-base font-semibold text-ht-muted">{value != null ? unit : ''}</span></p>
      {within === true && <StatusChip tone="ok" className="mt-2">{note}</StatusChip>}
      {within === false && <StatusChip tone="caution" className="mt-2">{note}</StatusChip>}
      {within == null && note && <p className="mt-2 text-sm text-ht-muted">{note}</p>}
    </div>
  );
}
