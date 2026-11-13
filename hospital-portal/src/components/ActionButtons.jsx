import { useEffect, useState } from 'react';
import { ACTIONS, canTransition, whyNot } from '../services/stateMachine.js';
import { useEmergencies } from './EmergencyProvider.jsx';

/**
 * Acknowledge / Dispatch / En route / Arrived / Handed over (feature #10).
 * Only the valid next step is enabled. The others carry a tooltip saying why not.
 */
export default function ActionButtons({ emergency }) {
  const { act } = useEmergencies();
  const [busy, setBusy] = useState(null); // target state being sent
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null); // action waiting for confirmation
  const id = emergency.emergency_id;

  // Clear messages when another emergency is selected.
  useEffect(() => {
    setError('');
    setConfirming(null);
  }, [id]);

  async function run(action) {
    setConfirming(null);
    setError('');
    setBusy(action.target);
    try {
      await act(id, action.target);
    } catch (err) {
      setError(`${action.label} failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {ACTIONS.map((action) => {
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

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 font-semibold text-red-800">
          {error}
        </p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-bold">Dispatch an ambulance?</h3>
            <p className="mt-2 text-slate-600">
              Emergency <b>{id}</b>, patient <b>{emergency.patient_id}</b>. This is a simulated dispatch. No real
              ambulance is contacted.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirming(null)} className="rounded-lg bg-slate-200 px-5 py-2.5 text-lg font-semibold">
                Not yet
              </button>
              <button
                data-testid="confirm-dispatch"
                onClick={() => run(confirming)}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-lg font-bold text-white hover:bg-red-700"
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
