// Emergency state machine for the hospital side (feature #10).
// The buttons, the mock backend and the tests all use this one file,
// so an invalid step is impossible in every place at once.

export const TRANSITIONS = {
  SOS_SENT: ['HOSPITAL_ACKNOWLEDGED'],
  ESCALATED: ['HOSPITAL_ACKNOWLEDGED'], // an escalated alert can still be acknowledged
  HOSPITAL_ACKNOWLEDGED: ['AMBULANCE_DISPATCHED'],
  AMBULANCE_DISPATCHED: ['EN_ROUTE'],
  EN_ROUTE: ['ARRIVED'],
  ARRIVED: ['HANDOVER_DONE'],
  HANDOVER_DONE: [], // final
  CANCELLED: [], // final
};

export const FINAL_STATES = ['HANDOVER_DONE', 'CANCELLED'];

// The patient can cancel only before an ambulance has been dispatched.
export const CANCELLABLE_STATES = ['SOS_SENT', 'ESCALATED', 'HOSPITAL_ACKNOWLEDGED'];

// Buttons shown to hospital staff, in order.
export const ACTIONS = [
  { target: 'HOSPITAL_ACKNOWLEDGED', label: 'Acknowledge' },
  { target: 'AMBULANCE_DISPATCHED', label: 'Dispatch', confirm: true },
  { target: 'EN_ROUTE', label: 'En route' },
  { target: 'ARRIVED', label: 'Arrived' },
  { target: 'HANDOVER_DONE', label: 'Handed over' },
];

const ORDER = ['SOS_SENT', 'HOSPITAL_ACKNOWLEDGED', 'AMBULANCE_DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_DONE'];
const rank = (state) => (state === 'ESCALATED' ? 0 : ORDER.indexOf(state));

export const isFinal = (state) => FINAL_STATES.includes(state);
export const nextStates = (state) => TRANSITIONS[state] || [];
export const canTransition = (from, to) => nextStates(from).includes(to);
export const canCancel = (state) => CANCELLABLE_STATES.includes(state);

/** Reason a button is disabled (used as its tooltip). Empty string when the step is allowed. */
export function whyNot(from, to) {
  if (canTransition(from, to)) return '';
  if (from === 'CANCELLED') return 'This emergency was cancelled. No further action is allowed.';
  if (from === 'HANDOVER_DONE') return 'This emergency is finished. The patient was handed over.';
  if (rank(from) < 0) return 'The alert has not reached the hospital yet.';
  if (rank(to) <= rank(from)) return 'This step is already done.';
  const next = ACTIONS.find((a) => a.target === nextStates(from)[0]);
  return `Not yet. "${next?.label}" comes first.`;
}
