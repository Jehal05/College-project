// Response timeline (feature #19).
// Shared component: it needs only React and two props, so the patient app can use the same file.
//   events    – status_events array: [{ state, timestamp, actor }]
//   createdAt – ISO time of the alert (falls back to the first event)
// An event may also carry an optional `note` (used for "Now alerting <hospital>").
import { useEffect, useState } from 'react';

const STAGES = ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE'];
const FINAL = ['HANDOVER_DONE', 'CANCELLED'];
const LABELS = {
  MONITORING: 'Monitoring',
  SYMPTOMS_REPORTED: 'Symptoms reported',
  EMERGENCY_DETECTED: 'Emergency detected',
  SOS_SENT: 'Alert sent',
  HOSPITAL_ACKNOWLEDGED: 'Hospital acknowledged',
  AMBULANCE_DISPATCHED: 'Ambulance dispatched',
  EN_ROUTE: 'Ambulance en route',
  ARRIVED: 'Arrived',
  HANDOVER_DONE: 'Handed over',
  CANCELLED: 'Cancelled',
  ESCALATED: 'Escalated to next hospital',
};
// An event with state 'NOTE' is a note with no state change: its `note` text is the title.
const isNote = (e) => e.state === 'NOTE';

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${s % 60} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function Timeline({ events = [], createdAt }) {
  const sorted = [...events]
    .map((e) => ({ ...e, ms: new Date(e.timestamp).getTime() }))
    .filter((e) => !Number.isNaN(e.ms))
    .sort((a, b) => a.ms - b.ms);
  const startMs = createdAt ? new Date(createdAt).getTime() : sorted[0]?.ms;
  const finalEvent = sorted.find((e) => FINAL.includes(e.state));
  const cancelled = sorted.some((e) => e.state === 'CANCELLED');

  // Live counter: ticks every second and stops at HANDOVER_DONE or CANCELLED.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (finalEvent) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [Boolean(finalEvent)]);

  if (!startMs) return <p className="text-slate-500">No timeline yet.</p>;

  const lastStage = Math.max(-1, ...sorted.map((e) => STAGES.indexOf(e.state)));
  const pending = cancelled ? [] : STAGES.slice(lastStage + 1);
  const elapsed = ((finalEvent ? finalEvent.ms : now) - startMs) / 1000;

  return (
    <div data-testid="timeline">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <span className="text-sm text-slate-500">{finalEvent ? 'Total time' : 'Time since alert'}</span>
        <span data-testid="timeline-counter" className={`text-3xl font-bold tabular-nums ${finalEvent ? 'text-slate-700' : 'text-red-600'}`}>
          {formatDuration(elapsed)}
        </span>
        {finalEvent && <span className="text-sm font-semibold text-slate-500">(stopped)</span>}
      </div>

      <ol className="space-y-0">
        {sorted.map((e, i) => {
          const special = e.state === 'CANCELLED' ? 'cancelled' : e.state === 'ESCALATED' ? 'escalated' : isNote(e) ? 'note' : 'done';
          const dot = { cancelled: 'bg-red-600', escalated: 'bg-orange-500', note: 'bg-sky-500', done: 'bg-emerald-600' }[special];
          const text = { cancelled: 'text-red-700', escalated: 'text-orange-700', note: 'text-sky-800', done: 'text-slate-900' }[special];
          return (
            <li key={`${e.state}-${e.ms}-${i}`} data-stage={e.state} data-reached="true" className="relative flex gap-3 pb-4">
              <div className="flex flex-col items-center">
                <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${dot}`} />
                {(i < sorted.length - 1 || pending.length > 0) && <span className="w-0.5 flex-1 bg-slate-300" />}
              </div>
              <div>
                <div className={`text-lg font-bold ${text}`}>{isNote(e) ? e.note : LABELS[e.state] || e.state}</div>
                <div className="text-slate-600">
                  {clock(e.ms)} · {formatDuration((e.ms - startMs) / 1000)} since alert
                  {i > 0 && ` · ${formatDuration((e.ms - sorted[i - 1].ms) / 1000)} after previous step`}
                </div>
                {e.note && !isNote(e) && <div className="font-semibold text-orange-700">{e.note}</div>}
                {e.actor && <div className="text-sm text-slate-500">By {e.actor}</div>}
              </div>
            </li>
          );
        })}
        {pending.map((state, i) => (
          <li key={state} data-stage={state} data-reached="false" className="relative flex gap-3 pb-4 text-slate-400">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 bg-white" />
              {i < pending.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
            </div>
            <div>
              <div className="text-lg font-semibold">{LABELS[state]}</div>
              <div className="text-sm">Not reached yet</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
