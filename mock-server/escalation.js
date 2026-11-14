// Phase 9: if nobody acknowledges within ESCALATION_SECONDS, the alert moves to the next hospital in the ranked list.
// Sends hospital.escalated { escalation_level, from_hospital_id, to_hospital_id, to_hospital_name }, then hospital.alerted for the new one.
// The delay is divided by DEMO_SPEED like every other timer. /demo/no-ack (or NO_ACK_DEMO=1) makes the fake hospital stay silent.
const demo = { noAck: process.env.NO_ACK_DEMO === '1', seconds: null };
const seconds = () => demo.seconds || Number(process.env.ESCALATION_SECONDS) || 30;
const noAck = () => demo.noAck;
const reset = () => { demo.noAck = process.env.NO_ACK_DEMO === '1'; demo.seconds = null; };
const configure = ({ enabled, escalate_after_seconds: s }) => { demo.noAck = Boolean(enabled); demo.seconds = Number.isFinite(s) && s > 0 ? s : null; };

// emit(emergency, type, state, payload, patch) and later(emergency, ms, fn) come from the simulator.
function start(emergency, ranked, { emit, later }) {
  const hospitalOf = (h) => ({ id: h.id, name: h.name, distance_km: h.distance_km });
  function step(level) {
    later(emergency, seconds() * 1000, () => {
      if (emergency.state !== 'SOS_SENT') return; // acknowledged, dispatched or cancelled: nothing to escalate
      const next = ranked[level]; // ranked[0] is the first hospital; level 1 is the second
      if (!next) return;
      const from = emergency.hospital;
      emit(emergency, 'hospital.escalated', 'SOS_SENT', { escalation_level: level, from_hospital_id: from && from.id, to_hospital_id: next.id, to_hospital_name: next.name },
        { hospital: hospitalOf(next) });
      emit(emergency, 'hospital.alerted', 'SOS_SENT', { hospital_id: next.id, rank: next.rank, hospital: hospitalOf(next), escalation_level: level });
      step(level + 1);
    });
  }
  step(1);
}

module.exports = { start, noAck, reset, configure };
