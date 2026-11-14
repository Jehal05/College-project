// Card, list row and section header: the building blocks of every screen.
import { Link } from 'react-router-dom';
import Icon from '../icons';

export default function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return <Tag className={'rounded-card border border-slate-200 bg-white p-4 shadow-card ' + className} {...rest}>{children}</Tag>;
}

export function SectionHeader({ children, action, as: Tag = 'h2', className = '' }) {
  return (
    <div className={'mb-2 mt-6 flex items-center justify-between gap-2 ' + className}>
      <Tag className="text-lg font-bold text-slate-900">{children}</Tag>
      {action}
    </div>
  );
}

// A tappable row: round icon, title, optional detail, chevron. Pass `to` for a link.
export function ListRow({ icon, title, detail, to, trailing, className = '', ...rest }) {
  const cls = 'flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-2 ' + (to ? 'hover:bg-slate-50 ' : '') + className;
  const body = (
    <>
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon name={icon} /></span>}
      <span className="min-w-0 flex-1"><span className="block break-words font-semibold text-slate-900">{title}</span>
        {detail && <span className="block break-words text-sm text-slate-600">{detail}</span>}</span>
      {trailing || (to && <Icon name="chevron" className="text-slate-500" />)}
    </>
  );
  return to ? <Link to={to} className={cls} {...rest}>{body}</Link> : <div className={cls} {...rest}>{body}</div>;
}

// Initials in a circle (no photo file).
export function Avatar({ name = '', size = 48 }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">
      {initials || '?'}
    </span>
  );
}
