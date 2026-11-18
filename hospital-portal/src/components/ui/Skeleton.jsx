import { cx } from '../../services/uiClasses.js';

/** Grey placeholder block while data loads. `label` is the translated "Loading" text for screen readers. */
export default function Skeleton({ label, className = 'h-6 w-full', ...rest }) {
  return (
    <div role="status" aria-busy="true" className={cx('animate-pulse rounded bg-slate-200 motion-reduce:animate-none', className)} {...rest}>
      <span className="sr-only">{label}</span>
    </div>
  );
}
