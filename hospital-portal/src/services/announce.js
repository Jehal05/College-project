// What a screen reader hears when something happens in the queue. Pure function (tests: announce.test.js).
// Returns { text, politeness: 'assertive' | 'polite' } or null (say nothing).
import { TYPE_LABELS } from './contract.js';
import { typeText } from '../i18n/phrases.js';
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

// Words come from the translate function in ctx.t (from i18n/translate.js). Without it everything stays English, as before.
const tr = (ctx, key, english, vars) => {
  if (!ctx.t) return english;
  const v = ctx.t(key, vars);
  return v === key ? english : v;
};
const who = (e, ctx) => (e?.patient_id == null ? tr(ctx, 'ann.patientNone', 'patient not shared') : tr(ctx, 'ann.patient', `patient ${e.patient_id}`, { id: e.patient_id }));
const typeWord = (e, ctx) => (ctx.t && e?.type ? typeText(ctx.t, e.type) : TYPE_LABELS[e?.type] || e?.type || 'Alert');
const say = (ctx, key, english, e, extra = {}) => tr(ctx, key, english, { type: typeWord(e, ctx), who: who(e, ctx), ...extra });

function newAlertText(e, ctx) {
  const emergency = e.severity === 'EMERGENCY';
  const key = emergency ? 'ann.newEmergency' : 'ann.newAlert';
  const english = `${emergency ? 'New emergency alert' : 'New alert'}: ${typeWord(e, {})}, ${who(e, {})}, simulated`;
  return { text: say(ctx, key, english, e), politeness: emergency ? 'assertive' : 'polite' };
}

/**
 * @param list    emergencies BEFORE the event was applied
 * @param msg     normalised event
 * @param ctx     { hospitalId, scope, selectedId, t? }  t = optional translate function (key, vars) => text
 */
export function announcementFor(list, msg, ctx = {}) {
  if (!msg?.emergency_id) return null;
  const known = list.find((e) => e.emergency_id === msg.emergency_id);
  const visible = (e) => inScope(e, ctx.hospitalId, ctx.scope || 'all');

  if (msg.event === 'emergency.created') {
    if (known) return null;
    const e = { ...msg.payload, emergency_id: msg.emergency_id, state: msg.state || 'SOS_SENT' };
    if (!visible(e)) return null;
    if (isEarly(e.state)) return { text: say(ctx, 'ann.early', `Early notice: ${typeWord(e, {})}, ${who(e, {})}, simulated`, e), politeness: 'polite' };
    if (isFinal(e.state)) return null;
    return newAlertText(e, ctx);
  }
  if (!known) return null;
  // Escalated TO this desk: a new alert here (checked first: before the move it was held by another hospital).
  if (msg.event === 'hospital.escalated' && ctx.hospitalId != null && String(msg.payload?.to_hospital_id) === String(ctx.hospitalId) && String(known.alerted_hospital_id) !== String(ctx.hospitalId)) return newAlertText(known, ctx);
  if (!visible(known)) return null;
  // An early notice that became a real SOS is announced like a new alert.
  if (msg.state === 'SOS_SENT' && isEarly(known.state)) return newAlertText(known, ctx);
  // State changes are announced for every alert in the queue. The open alert is short; any other alert also says which patient,
  // so a screen reader user can tell which card moved.
  if (msg.state && msg.state !== known.state && STATE_WORDS[msg.state]) {
    const open = ctx.selectedId === known.emergency_id;
    const word = tr(ctx, `ann.st.${msg.state}`, STATE_WORDS[msg.state]);
    return { text: open ? say(ctx, 'ann.open', `${typeWord(known, {})}: ${STATE_WORDS[msg.state]}`, known, { word }) : say(ctx, 'ann.other', `${typeWord(known, {})}, ${who(known, {})}: ${STATE_WORDS[msg.state]}`, known, { word }), politeness: 'polite' };
  }
  return null;
}
