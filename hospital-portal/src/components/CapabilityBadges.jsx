import { CAPABILITY_LABELS } from '../services/contract.js';
import { useT } from '../i18n/index.js';

const SHOWN = ['cath_lab', 'stroke_unit', 'icu'];

/** Specialty badges: green = has it, grey and struck through = does not. */
export default function CapabilityBadges({ capabilities = {}, size = 'md' }) {
  const t = useT();
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <div className="flex flex-wrap gap-1.5">
      {SHOWN.map((cap) => (
        <span
          key={cap}
          className={`rounded-md font-semibold ${pad} ${
            capabilities[cap] ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 line-through'
          }`}
        >
          {t(`capl.${cap}`) === `capl.${cap}` ? CAPABILITY_LABELS[cap] : t(`capl.${cap}`)}
        </span>
      ))}
    </div>
  );
}
