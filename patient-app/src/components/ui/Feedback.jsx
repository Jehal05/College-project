// Chips, inline notices, empty states and skeleton loaders. Notices ALWAYS carry an icon and text, never colour alone.
import Icon from '../icons';

const TONE = {
  neutral: 'bg-slate-100 text-slate-800',
  brand: 'bg-brand-100 text-brand-900',
  success: 'bg-green-100 text-green-900',
  warning: 'bg-amber-100 text-amber-900',
};

export function Chip({ tone = 'neutral', icon, children, className = '' }) {
  return (
    <span className={'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ' + TONE[tone] + ' ' + className}>
      {icon && <Icon name={icon} size={14} />}{children}
    </span>
  );
}

const NOTICE = {
  info: ['border-brand-200 bg-brand-50 text-brand-900', 'info'],
  warning: ['border-amber-300 bg-amber-50 text-amber-900', 'alert'],
  success: ['border-green-300 bg-green-50 text-green-900', 'check'],
};

export function InlineNotice({ tone = 'info', role, children, className = '' }) {
  const [cls, icon] = NOTICE[tone];
  return (
    <div role={role} className={'flex gap-3 rounded-xl border p-3 text-sm ' + cls + ' ' + className}>
      <Icon name={icon} className="mt-0.5" /><div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="rounded-card border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-card"><Icon name={icon} size={24} /></span>
      {title && <p className="font-bold text-slate-900">{title}</p>}
      {children && <p className="mt-1 text-sm text-slate-600">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = 'h-6 w-full' }) {
  return <div aria-hidden="true" className={'skeleton ' + className} />;
}
