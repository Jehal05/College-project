import { badgeClass, stateTone, toneSymbol } from '../../services/uiClasses.js';

/** Case status: a symbol plus the words plus a tone, so it never relies on colour alone. `label` is already translated. */
export default function StatusPill({ state, label, className = '', ...rest }) {
  const tone = stateTone(state);
  return (
    <span data-tone={tone} className={badgeClass(tone, className)} {...rest}>
      <span aria-hidden="true">{toneSymbol(tone)}</span>
      {label}
    </span>
  );
}
