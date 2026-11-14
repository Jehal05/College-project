// What the Emergency Response Center may say. Every step shows as done ONLY if the exact event for it exists in the
// emergency's history: a later event never makes an earlier step "done" (for example EN_ROUTE does not prove "dispatched").
export const STAGES = [
  ['detected', 'EMERGENCY_DETECTED'], ['sos', 'SOS_SENT'], ['ack', 'HOSPITAL_ACKNOWLEDGED'], ['dispatched', 'AMBULANCE_DISPATCHED'],
  ['enroute', 'EN_ROUTE'], ['arrived', 'ARRIVED'], ['handover', 'HANDOVER_DONE'],
];
export const FINAL = ['CANCELLED', 'HANDOVER_DONE'];

export const hasEvent = (events, state) => (events || []).some((e) => e.state === state);

export function stages(events) {
  return STAGES.map(([key, state]) => {
    const e = (events || []).find((x) => x.state === state);
    return { key, state, done: !!e, at: e ? e.timestamp : null };
  });
}

// CANCELLED or ESCALATED when that is the latest thing that happened, else null.
export function endedAs(events) {
  const last = (events || [])[(events || []).length - 1];
  return last && (last.state === 'CANCELLED' || last.state === 'ESCALATED') ? last.state : null;
}

// Which emergency to follow: the one this device remembers, else the newest one that has not finished.
export function pickActive(rememberedId, list) {
  if (rememberedId) return rememberedId;
  const open = (list || []).find((e) => !FINAL.includes(e.final_state));
  return open ? open.id : null;
}

// ETA is only worth showing once an ambulance was dispatched (that exact event) and the server gave a number.
export const showEta = (events, eta) => hasEvent(events, 'AMBULANCE_DISPATCHED') && typeof eta === 'number' && eta >= 0;
