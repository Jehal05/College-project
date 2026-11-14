// Loads the uploaded reports and offers upload / delete.
import { useCallback, useEffect, useState } from 'react';
import { deleteReport, getReports, uploadReport } from '../services/api';

export default function useReports(patientId) {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(() => {
    setStatus('loading');
    getReports(patientId).then((list) => { setReports(list); setStatus('ready'); }).catch(() => setStatus('error'));
  }, [patientId]);
  useEffect(load, [load]);

  const refresh = (promise) => promise.then(() => getReports(patientId)).then(setReports);
  return {
    reports, status, load,
    upload: (file) => refresh(uploadReport(patientId, file)),
    remove: (id) => refresh(deleteReport(patientId, id)),
  };
}
