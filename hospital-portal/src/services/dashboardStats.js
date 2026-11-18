// The four numbers on the dashboard stats strip. Pure: no React. Tests: dashboardStats.test.js.
// Nothing is invented: a number that the data does not give is null, and the screen says "Not available".
import { isFinal, isEarly } from './stateMachine.js';
import { capacityView } from './capacity.js';

/**
 * @param emergencies  the alerts in the current scope (what the queue shows)
 * @param opts.hospital      this desk's own hospital record (or null)
 * @param opts.units         the ambulance list (sample units carry sample: true)
 * @param opts.loaded        false while the first load is still running: tiles then have no value yet
 * @returns {{active, onCall, beds, unacknowledged, escalated}}  each { value: number|null, simulated?: boolean }
 */
export function dashboardStats(emergencies = [], { hospital = null, units = [], loaded = true } = {}) {
  const list = Array.isArray(emergencies) ? emergencies : [];
  const open = list.filter((e) => !isFinal(e.state));
  const none = { value: null };
  if (!loaded && list.length === 0) return { active: none, onCall: none, beds: bedsTile(hospital), unacknowledged: none, escalated: none };
  return {
    active: { value: open.length },
    // A unit is "on a call" only when an open, real (not early) alert names it. Never guessed from the fleet list.
    onCall: { value: new Set(open.filter((e) => e.ambulance_id && !isEarly(e.state)).map((e) => e.ambulance_id)).size, simulated: (units || []).some((u) => u.sample) },
    beds: bedsTile(hospital),
    // Lifecycle states, as they are: SOS_SENT = not acknowledged yet; ESCALATED = moved on to the next hospital.
    unacknowledged: { value: open.filter((e) => e.state === 'SOS_SENT').length },
    escalated: { value: open.filter((e) => e.state === 'ESCALATED').length },
  };
}

function bedsTile(hospital) {
  const view = capacityView(hospital);
  return { value: view ? view.beds.value : null };
}
