// Status chip for themed screens. The label is required and an icon is always shown, so colour is never the only signal.
import Icon from '../icons';

const TONE = {
  ok: ['border-ht-accent2/50 bg-ht-accent2/10 text-ht-accent2', 'check'],
  info: ['border-ht-accent/50 bg-ht-accent/10 text-ht-accent', 'info'],
  caution: ['border-ht-warning/60 bg-ht-warning/10 text-ht-warning', 'alert'],
  emergency: ['border-ht-emergency/60 bg-ht-emergency/10 text-ht-emergencytext', 'alert'],
  neutral: ['border-ht-line bg-ht-card text-ht-muted', 'clock'],
};

export default function StatusChip({ tone = 'neutral', icon, children, className = '' }) {
  const [cls, defaultIcon] = TONE[tone] || TONE.neutral;
  return (
    <span className={'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ' + cls + ' ' + className}>
      <Icon name={icon || defaultIcon} size={14} />{children}
    </span>
  );
}
