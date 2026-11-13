// After sign in (or on reload) use the language saved on the patient record.
// Exception: if the person picked a language on the Login screen, that choice is saved to the record instead.
import { useEffect } from 'react';
import i18n, { isSupportedLanguage, setLanguage } from '../i18n';
import { getPatient, updatePatient } from '../services/api';
import useAuth from './useAuth';

let pickedBeforeLogin = false;
export const markPickedBeforeLogin = () => { pickedBeforeLogin = true; };

export default function useLanguageSync() {
  const { session } = useAuth();
  useEffect(() => {
    if (!session) return;
    getPatient(session.patient_id).then((patient) => {
      if (pickedBeforeLogin) {
        pickedBeforeLogin = false;
        if (patient.language !== i18n.language) updatePatient(session.patient_id, { language: i18n.language }).catch(() => {});
      } else if (isSupportedLanguage(patient.language) && patient.language !== i18n.language) {
        setLanguage(patient.language);
      }
    }).catch(() => { /* keep the language chosen on this device */ });
  }, [session]);
}
