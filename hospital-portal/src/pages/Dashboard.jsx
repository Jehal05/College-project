import { usePresenting } from '../components/usePresenting.js';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
import { CityLabel } from '../components/CityBar.jsx';
import { useCityScope } from '../components/useCityScope.js';
import AvailabilityForm from '../components/AvailabilityForm.jsx';
import OwnCapacity from '../components/OwnCapacity.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatsStrip from '../components/StatsStrip.jsx';
import { useAmbulances } from '../components/AmbulanceProvider.jsx';
import { useT } from '../i18n/index.js';

export default function Dashboard() {
  const presenting = usePresenting(); // in presentation mode the mock helper buttons are hidden
  const t = useT();
  const { session } = useAuth();
  const { emergencies: everyAlert, visibleEmergencies, unreadCount, loading, error, refresh, markRead } = useEmergencies();
  const scope = useSyncExternalStore(subscribeUi, getScope);
  const cityScope = useCityScope();
  const emergencies = useMemo(() => cityScope.alerts(visibleEmergencies), [cityScope, visibleEmergencies]);
  const hidden = hiddenCount(cityScope.alerts(everyAlert), session?.hospital_id, scope);
  const listRef = useRef(null);
  const { hospitals, error: hospitalError } = useHospitals();
  const { units } = useAmbulances();
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
        <h1 className="text-2xl font-bold">{hospital?.name || t('map.l.hospital')}</h1>
        <CityLabel />
        <SimulatedBadge text={t('dash.simulatedEvent')} />
        <ConnectionBadge />
        <Button variant="secondary" data-testid="toggle-availability" onClick={() => setShowAvailability((v) => !v)} className="ml-auto">
          {showAvailability ? t('dash.hideBeds') : t('dash.updateBeds')}
        </Button>
        {USE_MOCK && !presenting && (
          <>
            <Button data-testid="mock-new-alert" onClick={() => mockCreateEmergency()}>{t('dash.simNew')}</Button>
            <Button variant="secondary" data-testid="mock-early" onClick={() => mockCreateEarlyNotice('HEART')}>{t('dash.simEarly')}</Button>
          </>
        )}
      </div>

      <StatsStrip emergencies={emergencies} hospital={hospitals.find((h) => String(h.id) === String(session?.hospital_id)) || null} units={units} loaded={!loading} />
      <OwnCapacity />

      {showAvailability && (
        <div className="border-b border-slate-300 bg-slate-50 px-6 py-4">
          <AvailabilityForm hospital={hospital} />
        </div>
      )}

      {hospitalError && <ErrorState message={hospitalError} className="mx-6 mt-4" />}
      {error && <ErrorState message={error} className="mx-6 mt-4" />}

      <div className="grid flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[440px_1fr]">
        {/* Left: alert queue */}
        <section id="alert-queue" tabIndex={-1} aria-labelledby="queue-heading" className="min-w-0 focus:outline-none">
          <h2 id="queue-heading" className="mb-3 text-xl font-bold">
            {t('dash.queue')} <span data-testid="open-count" className="text-slate-500">{t('dash.open', { n: openCount })}</span>
            {unreadCount > 0 && (
              <span data-testid="unread-count" className="ml-2 rounded-full bg-sky-500 px-2.5 py-0.5 text-sm font-bold text-white">
                {t('dash.unread', { n: unreadCount })}
              </span>
            )}
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-3" role="group" aria-label={t('dash.scopeLabel')}>
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
                {hidden === 1 ? t('dash.otherOne') : t('dash.otherMany', { n: hidden })}
              </span>
            )}
            {/* In "My hospital" the desk is told that alerts exist elsewhere, with one click to see them. */}
            {scope === 'mine' && hidden > 0 && (
              <button data-testid="show-all-link" onClick={() => setScope('all')} className="text-sm font-semibold text-sky-700 underline">
                {t('dash.showAll')}
              </button>
            )}
          </div>
          {loading && emergencies.length === 0 && (
            <div className="space-y-3">
              <Skeleton label={t('dash.loading')} className="h-24 w-full" />
              <Skeleton aria-hidden="true" role="presentation" className="h-24 w-full" />
            </div>
          )}
          {!loading && emergencies.length === 0 && <EmptyState data-testid="queue-empty" title={scope === 'mine' ? t('dash.emptyMine') : t('dash.emptyAll')} />}
          <ul ref={listRef} aria-label={t('dash.queueLabel')} onKeyDown={onListKeyDown} className="space-y-3">
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
        <section className="min-w-0 rounded-2xl bg-white p-6 shadow">
          {selected ? <EmergencyDetail emergency={selected} /> : <p className="text-slate-500">{t('dash.selectAlert')}</p>}
        </section>
      </div>
    </div>
  );
}
