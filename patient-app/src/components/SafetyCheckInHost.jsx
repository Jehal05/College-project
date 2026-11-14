// Mounted once in App while signed in: runs the inactivity timer (if the person turned it on) and shows the check-in screen.
import { useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useInactivity from '../hooks/useInactivity';
import usePreferences from '../hooks/usePreferences';
import { usePending } from '../hooks/usePendingEmergency';
import { getActive } from '../utils/activeEmergency';
import { startCheckIn, useCheckIn } from '../utils/checkIn';
import SafetyCheckIn from './SafetyCheckIn';

export default function SafetyCheckInHost() {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const { prefs } = usePreferences(session.patient_id);
  const active = useCheckIn();
  const pending = usePending();
  const { enabled, minutes } = prefs.safety_checkin;
  // Never interrupt a running emergency or an unsent one.
  const busy = pathname.startsWith('/emergency') || !!getActive() || !!pending;
  useInactivity(enabled, minutes, () => { if (!busy) startCheckIn('INACTIVITY_CHECK'); });
  return active ? <SafetyCheckIn key={active.source} source={active.source} /> : null;
}
