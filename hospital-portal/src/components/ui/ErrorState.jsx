import { cx } from '../../services/uiClasses.js';
import Button from './Button.jsx';

/** Error message with an optional Try again button. role="alert" so it is announced. Never pass a stack trace. */
export default function ErrorState({ message, retryLabel, onRetry, className = '', ...rest }) {
  return (
    <div role="alert" className={cx('flex flex-wrap items-center gap-3 rounded-lg bg-red-100 p-3 font-semibold text-red-800', className)} {...rest}>
      <span>{message}</span>
      {onRetry && retryLabel && <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  );
}
