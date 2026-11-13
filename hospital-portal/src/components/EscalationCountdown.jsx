import { useEffect, useState } from 'react';
import { secondsLeft } from '../services/escalation.js';
import { ESCALATION_SECONDS } from './useRanking.js';

/**
 * "Escalates in 12 s" for an alert nobody has acknowledged yet (feature #43).
 * Shows nothing once the alert is acknowledged, cancelled or finished.
 *   hasNext – false when there is no further hospital to escalate to
 */
export default function EscalationCountdown({ emergency, hasNext = true, large = false }) {
  const [now, setNow] = useState(Date.now());
  const left = secondsLeft(emergency, now, ESCALATION_SECONDS);
  const active = left !== null && hasNext;

  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active]);

  if (left === null) return null;
  const size = large ? 'px-4 py-2 text-lg' : 'px-3 py-1 text-sm';
  if (!hasNext) {
    return (
      <span data-testid="countdown" data-left="" className={`inline-block rounded-lg bg-slate-200 font-semibold text-slate-700 ${size}`}>
        Last hospital on the list · no further escalation
      </span>
    );
  }
  return (
    <span
      data-testid="countdown"
      data-left={left}
      className={`inline-block rounded-lg font-bold tabular-nums ${size} ${left <= 10 ? 'bg-red-600 text-white' : 'bg-amber-200 text-amber-900'}`}
    >
      {left > 0 ? `Escalates in ${left} s` : 'Escalating to the next hospital…'}
    </span>
  );
}
