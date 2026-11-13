// What a screen reader hears when something happens in the queue. Pure function (tests: announce.test.js).
// Returns { text, politeness: 'assertive' | 'polite' } or null (say nothing).
import { TYPE_LABELS } from './contract.js';
import { isEarly, isFinal } from './stateMachine.js';
import { inScope } from './queueScope.js';

const STATE_WORDS = {
  HOSPITAL_ACKNOWLEDGED: 'Acknowledged',
  AMBULANCE_DISPATCHED: 'Ambulance dispatched (simulated)',
  EN_ROUTE: 'Ambulance en route (simulated)',
  ARRIVED: 'Arrived at hospital',
  HANDOVER_DONE: 'Handed over',
  CANCELLED: 'Cancelled by the patient',
  ESCALATED: 'Escalated to the next hospital',
};

const who = (e) => `patient ${e?.patient_id ?? 'not shared'}`;
const typeWord = (e) => TYPE_LABELS[e?.type] || e?.type || 'Alert';

function newAlertText(e) {
  const label = e.severity === 'EMERGENCY' ? 'New emergency alert' : 'New alert';
  return { text: `${label}: ${typeWord(e)}, ${who(e)}, simulated`, politeness: e.severity === 'EMERGENCY' ? 'assertive' : 'polite' };
}

/**
 * @param list    emergencies BEFORE the event was applied
 * @param msg     normalised event
 * @param ctx     { hospitalId, scope, selectedId }
 */
export function announcementFor(list, msg, ctx = {}) {
  if (!msg?.emergency_id) return null;
  const known = list.find((e) => e.emergency_id === msg.emergency_id);
  const visible = (e) => inScope(e, ctx.hospitalId, ctx.scope || 'all');

  if (msg.event === 'emergency.created') {
    if (known) return null;
    const e = { ...msg.payload, emergency_id: msg.emergency_id, state: msg.state || 'SOS_SENT' };
    if (!visible(e)) return null;
    if (isEarly(e.state)) return { text: `Early notice: ${typeWord(e)}, ${who(e)}, simulated`, politeness: 'polite' };
    if (isFinal(e.state)) return null;
    return newAlertText(e);
  }
  if (!known) return null;
  // Escalated TO this desk: a new alert here (checked first: before the move it was held by another hospital).
  if (msg.event === 'hospital.escalated' && ctx.hospitalId != null && String(msg.payload?.to_hospital_id) === String(ctx.hospitalId) && String(known.alerted_hospital_id) !== String(ctx.hospitalId)) return newAlertText(known);
  if (!visible(known)) return null;
  // An early notice that became a real SOS is announced like a new alert.
  if (msg.state === 'SOS_SENT' && isEarly(known.state)) return newAlertText(known);
  // State changes: only for the alert that is open on screen.
  if (msg.state && msg.state !== known.state && STATE_WORDS[msg.state] && ctx.selectedId === known.emergency_id) {
    return { text: `${typeWord(known)}: ${STATE_WORDS[msg.state]}`, politeness: 'polite' };
  }
  return null;
}
