import { useEffect, useState } from 'react';
import { ACTIONS, canTransition, whyNot } from '../services/stateMachine.js';
import { USE_MOCK } from '../services/config.js';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useAmbulances } from './AmbulanceProvider.jsx';

// With mock data the ambulance simulator sets En route and Arrived by itself, so those two
// buttons are hidden. With the real backend they stay as a manual fallback.
const SIMULATOR_DRIVEN = ['EN_ROUTE', 'ARRIVED'];

/**
 * Acknowledge / Dispatch / (En route / Arrived) / Handed over (feature #10).
 * Only the valid next step is enabled. The others carry a tooltip saying why not.
 * Dispatch opens a dialog to choose the ambulance (feature #44).
 */
export default function ActionButtons({ emergency }) {
  const { act } = useEmergencies();
  const { availableFor, requestTrip } = useAmbulances();
  const [busy, setBusy] = useState(null); // target state being sent
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null); // action waiting for confirmation
  const [unitId, setUnitId] = useState('');
  const id = emergency.emergency_id;
  const actions = USE_MOCK ? ACTIONS.filter((a) => !SIMULATOR_DRIVEN.includes(a.target)) : ACTIONS;
  const available = confirming ? availableFor(emergency) : [];

  // Clear messages when another emergency is selected.
  useEffect(() => {
    setError('');
    setConfirming(null);
  }, [id]);

  // Preselect the nearest available unit when the dialog opens.
  useEffect(() => {
    if (confirming) setUnitId(availableFor(emergency)[0]?.id || '');
  }, [Boolean(confirming)]);

  async function run(action, options = {}) {
    setConfirming(null);
    setError('');
    setBusy(action.target);
    try {
      const result = await act(id, action.target, options);
      if (result?.local_only) setError(`${action.label} was applied on this screen only: the backend has no endpoint for it yet.`);
      // The portal that dispatches also runs the simulated trip.
      if (action.target === 'AMBULANCE_DISPATCHED') setTimeout(() => requestTrip(id), 0);
    } catch (err) {
      setError(`${action.label} failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => {
          const allowed = canTransition(emergency.state, action.target);
          const sending = busy === action.target;
          return (
            <button
              key={action.target}
              data-action={action.target}
              disabled={!allowed || busy !== null}
              title={allowed ? '' : whyNot(emergency.state, action.target)}
              onClick={() => (action.confirm ? setConfirming(action) : run(action))}
              className={`rounded-lg px-5 py-3 text-lg font-bold ${
                allowed
                  ? 'bg-sky-600 text-white shadow hover:bg-sky-700 disabled:opacity-60'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              {sending ? `${action.label}…` : action.label}
            </button>
          );
        })}
      </div>
      {USE_MOCK && (
        <p className="mt-2 text-sm text-slate-500">After Dispatch, the simulated ambulance sets “En route” and “Arrived” by itself.</p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 font-semibold text-red-800">
          {error}
        </p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-bold">Dispatch an ambulance?</h3>
            <p className="mt-2 text-slate-600">
              Emergency <b>{id}</b>, patient <b>{emergency.patient_id}</b>. This is a simulated dispatch. No real
              ambulance is contacted.
            </p>

            {available.length === 0 ? (
              <p data-testid="no-units" role="alert" className="mt-4 rounded-xl bg-red-100 p-4 text-lg font-semibold text-red-800">
                No ambulance is available right now. Every unit is on another emergency. Dispatch is blocked until one is free.
              </p>
            ) : (
              <fieldset className="mt-4 space-y-2">
                <legend className="mb-1 font-semibold">Choose the unit to send (nearest first)</legend>
                {available.map((u, i) => (
                  <label
                    key={u.id}
                    data-testid="unit-option"
                    data-id={u.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${unitId === u.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}
                  >
                    <input type="radio" name="unit" className="h-6 w-6" checked={unitId === u.id} onChange={() => setUnitId(u.id)} />
                    <span className="flex-1">
                      <span className="text-lg font-bold">{u.call_sign}</span> <span className="text-slate-500">({u.id})</span>
                      {i === 0 && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-800">Nearest</span>}
                      <span className="block text-sm text-slate-600">Crew: {u.crew?.driver}, {u.crew?.paramedic}</span>
                    </span>
                    <span className="text-lg font-semibold tabular-nums">{u.distance_km} km</span>
                  </label>
                ))}
              </fieldset>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirming(null)} className="rounded-lg bg-slate-200 px-5 py-2.5 text-lg font-semibold">
                Not yet
              </button>
              <button
                data-testid="confirm-dispatch"
                disabled={!unitId || available.length === 0}
                onClick={() => run(confirming, { ambulanceId: unitId })}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Yes, dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
