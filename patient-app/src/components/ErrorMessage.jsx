// Red-free error box (red is kept for emergencies). Announced to screen readers.
export default function ErrorMessage({ children, onRetry, retryLabel }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
      <p>{children}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 min-h-[44px] rounded-lg bg-amber-200 px-4 font-semibold">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
