import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getScope, setScope, setSelectedId as publishSelected, subscribeUi } from '../services/uiStore.js';
import { hiddenCount } from '../services/queueScope.js';
import { USE_MOCK, mockCreateEmergency, mockCreateEarlyNotice } from '../services/api.js';
import { isFinal } from '../services/stateMachine.js';
import { useAuth } from '../components/AuthProvider.jsx';
import { useEmergencies } from '../components/EmergencyProvider.jsx';
import AlertCard from '../components/AlertCard.jsx';
import EmergencyDetail from '../components/EmergencyDetail.jsx';
import ConnectionBadge from '../components/ConnectionBadge.jsx';
import SimulatedBadge from '../components/SimulatedBadge.jsx';
import { useHospitals } from '../components/HospitalProvider.jsx';
import AvailabilityForm from '../components/AvailabilityForm.jsx';
import OwnCapacity from '../components/OwnCapacity.jsx';
import { useT } from '../i18n/index.js';

export default function Dashboard() {
  const t = useT();
  const { session } = useAuth();
  const { emergencies: everyAlert, visibleEmergencies, unreadCount, loading, error, refresh, markRead } = useEmergencies();
  const scope = useSyncExternalStore(subscribeUi, getScope);
  const emergencies = visibleEmergencies;
  const hidden = hiddenCount(everyAlert, session?.hospital_id, scope);
  const listRef = useRef(null);
  const { hospitals, error: hospitalError } = useHospitals();
  const hospital = hospitals.find((h) => h.id === session?.hospital_id) || hospitals[0] || null;
  const [selectedId, setSelectedId] = useState(null);
  const [showAvailability, setShowAvailability] = useState(false);

  const selected = emergencies.find((e) => e.emergency_id === selectedId) || null;
  const openCount = emergencies.filter((e) => !isFinal(e.state)).length;

  // Select the top alert when nothing is selected yet.
  useEffect(() => {
    if (!selected && emergencies.length > 0) setSelectedId(emergencies[0].emergency_id);
  }, [selected, emergencies]);

  useEffect(() => publishSelected(selectedId), [selectedId]); // the live announcer needs to know which alert is open

  // Arrow keys move between cards; Enter opens (the card is a button).
  function onListKeyDown(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const cards = [...listRef.current.querySelectorAll('[data-testid=alert-card]')];
    const i = cards.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    cards[Math.max(0, Math.min(cards.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  }

  // Opening an alert marks it read.
  useEffect(() => {
    if (selectedId) markRead(selectedId);
  }, [selectedId, markRead]);

  // With the real backend, fetch the full details and timeline of the selected emergency.
  useEffect(() => {
    if (!USE_MOCK && selectedId) refresh(selectedId);
  }, [selectedId, refresh]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-300 bg-white px-6 py-3">
        <h1 className="text-2xl font-bold">{hospital?.name || 'Hospital'}</h1>
        <SimulatedBadge text={t('dash.simulatedEvent')} />
        <ConnectionBadge />
        <button
          data-testid="toggle-availability"
          onClick={() => setShowAvailability((v) => !v)}
          className="ml-auto rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50"
        >
          {showAvailability ? 'Hide beds and ICU' : 'Update beds and ICU'}
        </button>
        {USE_MOCK && (
          <>
            <button
              data-testid="mock-new-alert"
              onClick={() => mockCreateEmergency()}
              className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
            >
              + Simulate new alert
            </button>
            <button
              data-testid="mock-early"
              onClick={() => mockCreateEarlyNotice('HEART')}
              className="rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
            >
              + Simulate early notice
            </button>
          </>
        )}
      </div>

      <OwnCapacity />

      {showAvailability && (
        <div className="border-b border-slate-300 bg-slate-50 px-6 py-4">
          <AvailabilityForm hospital={hospital} />
        </div>
      )}

      {hospitalError && <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{hospitalError}</p>}
      {error && <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}

      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[440px_1fr]">
        {/* Left: alert queue */}
        <section id="alert-queue" tabIndex={-1} aria-labelledby="queue-heading" className="focus:outline-none">
          <h2 id="queue-heading" className="mb-3 text-xl font-bold">
            {t('dash.queue')} <span data-testid="open-count" className="text-slate-500">{t('dash.open', { n: openCount })}</span>
            {unreadCount > 0 && (
              <span data-testid="unread-count" className="ml-2 rounded-full bg-sky-500 px-2.5 py-0.5 text-sm font-bold text-white">
                {t('dash.unread', { n: unreadCount })}
              </span>
            )}
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-3" role="group" aria-label="Which alerts to show">
            {[['mine', t('dash.mine')], ['all', t('dash.all')]].map(([value, label]) => (
              <button
                key={value}
                data-testid={`scope-${value}`}
                aria-pressed={scope === value}
                onClick={() => setScope(value)}
                className={`rounded-lg border-2 px-3 py-1.5 font-semibold ${scope === value ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
            {hidden > 0 && (
              <span data-testid="hidden-count" className="text-sm font-semibold text-slate-600">
                {hidden} alert{hidden === 1 ? '' : 's'} at other hospitals
              </span>
            )}
          </div>
          {loading && emergencies.length === 0 && <p className="text-slate-500">{t('dash.loading')}</p>}
          {!loading && emergencies.length === 0 && <p data-testid="queue-empty" className="text-slate-500">{scope === 'mine' ? 'No active alerts for this hospital.' : 'No active alerts.'}</p>}
          <ul ref={listRef} aria-label="Alert queue" onKeyDown={onListKeyDown} className="space-y-3">
            {emergencies.map((e) => (
              <li key={e.emergency_id}>
                <AlertCard
                  alert={e}
                  selected={e.emergency_id === selectedId}
                  onSelect={(a) => setSelectedId(a.emergency_id)}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Right: detail panel */}
        <section className="rounded-2xl bg-white p-6 shadow">
          {selected ? <EmergencyDetail emergency={selected} /> : <p className="text-slate-500">Select an alert to see its details.</p>}
        </section>
      </div>
    </div>
  );
}
