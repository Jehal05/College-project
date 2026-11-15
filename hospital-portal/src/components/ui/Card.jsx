import { cx } from '../../services/uiClasses.js';

/** White rounded panel used by the dashboard, analytics and map side panels. */
export default function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return <Tag className={cx('rounded-2xl bg-white p-5 shadow', className)} {...rest}>{children}</Tag>;
}
