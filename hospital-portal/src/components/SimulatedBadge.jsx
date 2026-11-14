/** Honest label required on every simulated element. */
export default function SimulatedBadge({ text = 'Simulated', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-500 bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800 ${className}`}
    >
      {text}
    </span>
  );
}
