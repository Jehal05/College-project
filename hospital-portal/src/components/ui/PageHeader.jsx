import { cx } from '../../services/uiClasses.js';

/** Page title row: the h1, optional badges after it, optional actions pushed to the right. */
export default function PageHeader({ title, badges, actions, className = '', headingProps = {} }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-3', className)}>
      <h1 className="text-3xl font-bold" {...headingProps}>{title}</h1>
      {badges}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
