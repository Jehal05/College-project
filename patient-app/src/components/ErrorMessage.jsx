// Red-free error box (red is kept for emergencies). Announced to screen readers. Icon + text, never colour alone.
import Icon from './icons';
import Button from './ui/Button';

export default function ErrorMessage({ children, onRetry, retryLabel }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <Icon name="alert" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p>{children}</p>
        {onRetry && <Button variant="secondary" onClick={onRetry} className="mt-2">{retryLabel}</Button>}
      </div>
    </div>
  );
}
