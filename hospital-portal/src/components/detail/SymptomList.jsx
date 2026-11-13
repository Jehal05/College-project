import { NOT_SHARED, originText } from '../../services/adapters.js';

/** Reported symptoms as words. A safety check-in has none, and says so. */
export default function SymptomList({ emergency: e }) {
  const fromCheckIn = originText(e);
  return (
    <div>
      <h3 className="mb-2 font-semibold">Reported symptoms <span className="text-sm font-normal text-slate-500">(sample content, pending doctor review)</span></h3>
      <div className="flex flex-wrap gap-2">
        {(e.symptoms || []).map((s) => (
          <span key={s} className="rounded-lg bg-red-50 px-3 py-1 font-medium text-red-800">{s}</span>
        ))}
        {!(e.symptoms || []).length && <span data-testid="no-symptoms" className="text-slate-600">{fromCheckIn ? 'None reported (safety check-in)' : NOT_SHARED}</span>}
      </div>
    </div>
  );
}
