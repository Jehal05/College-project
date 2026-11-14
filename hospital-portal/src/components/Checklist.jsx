// Pre-arrival checklist (feature #26): changes with the emergency type, ticks are
// stored on the emergency record with who ticked and when.
import { useEffect, useState } from 'react';
import checklists from '../data/checklists.json';
import { useEmergencies } from './EmergencyProvider.jsx';
import { formatTime } from './AlertCard.jsx';
import { reviewBadge, reviewSummary } from '../services/review.js';
import { useT } from '../i18n/index.js';

export default function Checklist({ emergency }) {
  const { tick } = useEmergencies();
  const t = useT();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const items = checklists[emergency.type] || [];
  const ticks = emergency.checklist || {};
  const done = items.filter((i) => ticks[i.id]?.done).length;
  const readOnly = emergency.state === 'CANCELLED';

  useEffect(() => setError(''), [emergency.emergency_id]);

  async function toggle(item) {
    setError('');
    setBusy(item.id);
    try {
      await tick(emergency.emergency_id, item.id, !ticks[item.id]?.done);
    } catch (err) {
      setError(t('ck.saveFail', { msg: err.message }));
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) return <p className="text-slate-500">{t('ck.none')}</p>;

  return (
    <div data-testid="checklist" data-type={emergency.type}>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span data-testid="checklist-progress" className="text-lg font-bold">
          {t('rd.checklistDone', { done, total: items.length })}
        </span>
        <span
          data-testid="review-badge"
          data-review={reviewSummary(items).state}
          className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${reviewSummary(items).state === 'reviewed' ? 'border-emerald-600 bg-emerald-100 text-emerald-900' : 'border-amber-500 bg-amber-100 text-amber-800'}`}
        >
          {reviewBadge(items)}
        </span>
      </div>
      <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      {readOnly && <p className="mb-2 font-semibold text-slate-600">Cancelled: the checklist is read-only.</p>}

      <ul className="space-y-2">
        {items.map((item) => {
          const t = ticks[item.id];
          return (
            <li key={item.id}>
              <label
                className={`flex items-start gap-3 rounded-xl border-2 p-3 ${
                  t?.done ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                } ${readOnly ? 'opacity-60' : 'cursor-pointer hover:border-sky-400'}`}
              >
                <input
                  type="checkbox"
                  data-item={item.id}
                  className="mt-0.5 h-7 w-7 shrink-0 accent-emerald-600"
                  checked={Boolean(t?.done)}
                  disabled={readOnly || busy === item.id}
                  onChange={() => toggle(item)}
                />
                <span>
                  <span className={`text-lg ${t?.done ? 'font-semibold' : ''}`}>{item.text}</span>
                  {t?.done && (
                    <span className="block text-sm text-slate-500">
                      Ticked by {t.by || 'staff'} at {formatTime(t.at)}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
    </div>
  );
}
