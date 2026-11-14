// Nearby help for one emergency: nearest AEDs (#23) and community responders (#24).
// All AED and responder data is SAMPLE data. "Notify responder" is a simulation: it only
// writes a note on the timeline. It never claims that a responder is coming.
import { useState } from 'react';
import aeds from '../data/aed.json';
import responders from '../data/responders.json';
import { nearestAeds, respondersNear, RESPONDER_RADIUS_KM } from '../services/nearby.js';
import { isFinal } from '../services/stateMachine.js';
import { useEmergencies } from './EmergencyProvider.jsx';
import { useT } from '../i18n/index.js';

export default function NearbyHelp({ emergency }) {
  const { addNote } = useEmergencies();
  const t = useT();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const e = emergency;
  const nearAeds = nearestAeds(aeds, e.location, 3);
  const people = respondersNear(responders, e.location);
  const notified = e.responders_notified || [];
  const closed = isFinal(e.state);

  async function notify(person) {
    setBusy(person.id);
    setError('');
    try {
      await addNote(
        e.emergency_id,
        'responder',
        `Simulated alert sent to ${person.name}. No reply received.`,
        { responders_notified: [...new Set([...notified, person.id])] },
      );
    } catch (err) {
      setError(`Could not send: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-testid="nearby-help" className="space-y-4">
      <p className="text-sm font-semibold text-slate-500">{t('nb.sample')}</p>

      <div>
        <h4 className="mb-1 font-semibold">{t('nb.nearestAed')}</h4>
        {nearAeds.length === 0 ? (
          <p className="text-slate-500">{t('nb.noLocation')}</p>
        ) : (
          <ul className="space-y-1">
            {nearAeds.map((a, i) => (
              <li key={a.id} data-testid="aed-row" data-id={a.id} className={`rounded-lg p-2 ${i === 0 ? 'bg-emerald-50 font-semibold' : 'bg-slate-50'}`}>
                {i === 0 && <span className="mr-2 rounded-full bg-emerald-600 px-2 py-0.5 text-sm text-white">{t('nb.nearest')}</span>}
                {a.name}: <b>{a.distance_km} km</b> · {t('nb.walk', { min: a.walk_min })}
                <span className="block text-sm font-normal text-slate-500">{a.note}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-1 font-semibold">{t('nb.responders', { km: RESPONDER_RADIUS_KM })}</h4>
        {people.length === 0 ? (
          <p data-testid="no-responders" className="text-slate-500">{t('nb.noResponders')}</p>
        ) : (
          <ul className="space-y-1">
            {people.map((p) => {
              const sent = notified.includes(p.id);
              return (
                <li key={p.id} data-testid="responder-row" data-id={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
                  <span className="flex-1">{p.name} · {p.skill} · <b>{p.distance_km} km</b></span>
                  <button
                    data-testid="notify-responder"
                    disabled={sent || closed || busy !== null}
                    onClick={() => notify(p)}
                    className="rounded-lg bg-purple-700 px-3 py-1.5 font-bold text-white hover:bg-purple-800 disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    {sent ? t('nb.sent') : t('nb.notify')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-1 text-sm text-slate-500">{t('nb.simNote')}</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
    </div>
  );
}
