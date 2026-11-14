import { Link } from 'react-router-dom';
import { isFinal, isEarly } from '../services/stateMachine.js';
import { fallbackStatuses, nextHospital } from '../services/escalation.js';
import { useAuth } from './AuthProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { useRanking } from './useRanking.js';
import RankingTable from './RankingTable.jsx';
import Checklist from './Checklist.jsx';
import TrackingMap from './TrackingMap.jsx';
import TeamAssignment from './TeamAssignment.jsx';
import ChatPanel from './ChatPanel.jsx';
import NearbyHelp from './NearbyHelp.jsx';
import PatientMiniMap from './PatientMiniMap.jsx';
import Timeline from './Timeline.jsx';
import DetailHeader from './detail/DetailHeader.jsx';
import PatientFacts from './detail/PatientFacts.jsx';
import SymptomList from './detail/SymptomList.jsx';
import VitalsGrid from './detail/VitalsGrid.jsx';
import ActionsPanel from './detail/ActionsPanel.jsx';
import NotesPanel from './NotesPanel.jsx';
import ReadinessWarning from './detail/ReadinessWarning.jsx';
import ReadinessCard from './detail/ReadinessCard.jsx';
import { useT } from '../i18n/index.js';

/** Right-hand panel of the dashboard: patient summary, map, actions and timeline. The parts live in ./detail/. */
export default function EmergencyDetail({ emergency }) {
  const { session } = useAuth();
  const { hospitals } = useHospitals();
  const t = useT();
  const e = emergency;
  const ranking = useRanking(e.type, e.location);
  const statuses = ranking ? fallbackStatuses(ranking.ranked, e) : {};
  const next = ranking ? nextHospital(ranking.ranked, e) : null;
  const escalatedTo = e.escalated_to_name || hospitals.find((h) => h.id === e.alerted_hospital_id)?.name;
  const hasAmbulance = Boolean(e.ambulance_id);

  return (
    <div data-testid="detail-panel" className="space-y-6">
      <DetailHeader emergency={e} escalatedTo={escalatedTo} />
      <ReadinessWarning emergency={e} />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-5">
          <PatientFacts emergency={e} />
          <SymptomList emergency={e} />
          <VitalsGrid emergency={e} />

          {!hasAmbulance && (
            <div>
              <h3 className="mb-2 font-semibold">{t('sec.patientLocation')}</h3>
              <PatientMiniMap location={e.location} />
            </div>
          )}

          <div>
            <h3 className="mb-2 font-semibold">{t('sec.team')}</h3>
            <TeamAssignment emergency={e} />
          </div>
        </div>

        <div className="space-y-5">
          <ActionsPanel emergency={e} next={next} />

          <div>
            <h3 className="mb-2 font-semibold">{t('sec.timeline')}</h3>
            <Timeline events={e.status_events} createdAt={e.created_at} t={t} />
          </div>

          <div>
            <h3 className="mb-2 font-semibold">{t('sec.notes')}</h3>
            <NotesPanel emergency={e} />
          </div>
        </div>
      </div>

      {hasAmbulance && (
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div>
            <h3 className="mb-2 text-xl font-bold">{t('sec.tracking')}</h3>
            <TrackingMap emergency={e} />
          </div>
          <div>
            <h3 className="mb-2 text-xl font-bold">{t('sec.chat')}</h3>
            <ChatPanel emergencyId={e.emergency_id} role="desk" senderName={session?.name || 'Hospital desk'} />
          </div>
        </div>
      )}

      {!isFinal(e.state) && !isEarly(e.state) && <ReadinessCard key={e.emergency_id} emergency={e} />}

      {isFinal(e.state) && (
        <Link data-testid="open-report" to={`/report/${e.emergency_id}?t=${encodeURIComponent(e.created_at)}`} className="inline-block rounded-lg bg-slate-800 px-5 py-3 text-lg font-bold text-white hover:bg-slate-900">
          Open post-event report
        </Link>
      )}

      <div>
        <h3 className="mb-2 text-xl font-bold">{t('sec.nearby')}</h3>
        <NearbyHelp emergency={e} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xl font-bold">{t('sec.checklist')}</h3>
          <Checklist emergency={e} />
        </div>
        <div>
          <h3 className="mb-2 text-xl font-bold">{t('sec.ranking')}</h3>
          <RankingTable ranking={ranking} statuses={statuses} ownHospitalId={session?.hospital_id} />
        </div>
      </div>
    </div>
  );
}
