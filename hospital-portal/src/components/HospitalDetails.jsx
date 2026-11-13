import CapabilityBadges from './CapabilityBadges.jsx';
import SimulatedBadge from './SimulatedBadge.jsx';
import { TYPE_LABELS } from '../services/contract.js';

/** Side panel shown when a hospital marker is clicked. */
export default function HospitalDetails({ hospital, type, onClose }) {
  if (!hospital) {
    return (
      <div className="rounded-2xl bg-white p-6 text-slate-500 shadow">
        Click a hospital marker to see its details.
      </div>
    );
  }
  const a = hospital.availability || {};

  return (
    <div className="rounded-2xl bg-white p-6 shadow space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{hospital.name}</h2>
          <p className="text-slate-600">{hospital.address}</p>
          <p className="text-slate-600">{hospital.phone}</p>
        </div>
        <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700" aria-label="Close">
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-100 p-3">
          <div className="text-sm text-slate-500">Distance (straight line)</div>
          <div className="text-2xl font-bold">{hospital.distance_km} km</div>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Travel time <SimulatedBadge text="Simulated ETA" className="!text-xs" />
          </div>
          <div className="text-2xl font-bold">{hospital.eta_min} min</div>
        </div>
      </div>

      {type && (
        <div
          className={`rounded-xl p-3 font-semibold ${
            hospital.capability_match ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {hospital.capability_match
            ? `Has the capabilities needed for: ${TYPE_LABELS[type]}`
            : `Missing a capability needed for: ${TYPE_LABELS[type]}`}
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold">Capabilities</h3>
        <CapabilityBadges capabilities={hospital.capabilities} />
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Availability</h3>
        <ul className="grid grid-cols-2 gap-2 text-lg">
          <li>Beds free: <b>{a.beds_free ?? '–'}</b></li>
          <li>ICU free: <b>{a.icu_free ?? '–'}</b></li>
          <li>Cath lab ready: <b>{a.cath_lab_ready ? 'Yes' : 'No'}</b></li>
          <li>Stroke unit ready: <b>{a.stroke_unit_ready ? 'Yes' : 'No'}</b></li>
        </ul>
      </div>
    </div>
  );
}
