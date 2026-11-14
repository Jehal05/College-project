// One place that gathers what the health screens need: live vitals, usual ranges, the in-memory history, the patient and the reports.
import { useEffect, useState } from 'react';
import useAuth from './useAuth';
import useVitals from './useVitals';
import useBaseline from './useBaseline';
import useConsents from './useConsents';
import useReports from './useReports';
import useVitalsHistory from './useVitalsHistory';
import { getPatient } from '../services/api';

export default function useHealthData() {
  const { session } = useAuth();
  const id = session.patient_id;
  const { vitals, connected } = useVitals();
  const { baseline } = useBaseline(id);
  const { consents } = useConsents(id);
  const sharing = !!consents && consents.vitals === true;
  const history = useVitalsHistory(vitals, sharing);
  const { reports } = useReports(id);
  const [patient, setPatient] = useState(null);
  useEffect(() => { getPatient(id).then(setPatient).catch(() => {}); }, [id]);
  return { id, vitals, connected, baseline, sharing, history, reports, patient };
}
