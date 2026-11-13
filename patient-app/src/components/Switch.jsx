// An on/off switch. It is a real button with role="switch", so screen readers say "on" or "off".
// The state is also written in words next to it, so it never depends on colour alone.
import { useTranslation } from 'react-i18next';
import Icon from './icons';

export default function Switch({ checked, onChange, labelId, disabled = false }) {
  const { t } = useTranslation();
  return (
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelId} disabled={disabled}
      onClick={() => onChange(!checked)} className="flex min-h-[44px] min-w-[96px] items-center gap-3 disabled:opacity-60">
      <span aria-hidden="true" className={'flex h-8 w-14 items-center rounded-full p-1 transition-colors ' + (checked ? 'justify-end bg-brand-700' : 'justify-start bg-slate-400')}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">{checked && <Icon name="check" size={14} className="text-brand-700" strokeWidth={3} />}</span>
      </span>
      <span className="text-base font-bold text-slate-900">{checked ? t('consent.on') : t('consent.off')}</span>
    </button>
  );
}
