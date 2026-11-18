import { cx } from '../../services/uiClasses.js';

/** "Nothing here yet" panel. Text comes from the caller (translated). */
export default function EmptyState({ title, body, children, className = '', ...rest }) {
  return (
    <div className={cx('rounded-xl bg-slate-100 p-6 text-slate-700', className)} {...rest}>
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 text-slate-600">{body}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
