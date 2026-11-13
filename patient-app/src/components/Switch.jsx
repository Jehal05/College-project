// An on/off switch. It is a real button with role="switch", so screen readers say "on" or "off".
// The state is also written in words next to it, so it never depends on colour alone.
import { useTranslation } from 'react-i18next';

export default function Switch({ checked, onChange, labelId, disabled = false }) {
  const { t } = useTranslation();
  return (
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelId} disabled={disabled}
      onClick={() => onChange(!checked)} className="flex min-h-[44px] min-w-[96px] items-center gap-3 disabled:opacity-60">
      <span aria-hidden="true" className={'flex h-7 w-12 items-center rounded-full p-1 ' + (checked ? 'justify-end bg-blue-700' : 'justify-start bg-slate-400')}>
        <span className="h-5 w-5 rounded-full bg-white" />
      </span>
      <span className="text-base font-bold text-slate-900">{checked ? t('consent.on') : t('consent.off')}</span>
    </button>
  );
}
