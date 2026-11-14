// Buttons. Variants: primary (brand), secondary (outline), ghost (text), emergency (red, ONLY inside the emergency flow).
// Every button is at least 44 px high; `large` is 56 px for emergency actions. Use `as="a"` or pass `to` for links.
import { Link } from 'react-router-dom';
import Icon from '../icons';

const BASE = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const VARIANT = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'border-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  ghost: 'text-brand-800 hover:bg-brand-50',
  emergency: 'bg-red-700 text-white hover:bg-red-800',
};

export default function Button({ variant = 'primary', icon, large = false, full = false, to, className = '', children, ...rest }) {
  const cls = [BASE, VARIANT[variant], large ? 'min-h-[56px] text-lg' : 'min-h-[44px] text-base', full ? 'w-full' : '', className].join(' ');
  const inner = <>{icon && <Icon name={icon} size={20} />}<span>{children}</span></>;
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}

// A round icon-only button. `label` is required: it is the accessible name.
export function IconButton({ icon, label, className = '', ...rest }) {
  return (
    <button type="button" aria-label={label} title={label}
      className={'inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 ' + className} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
