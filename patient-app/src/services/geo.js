// Finds the location to send with the SOS.
// Rules: consent off, or "Stop sharing" pressed -> no location. Otherwise try the device GPS (high accuracy, up to 8 seconds, never an old
// cached fix). It is read only after the location consent is on; the browser asks for its own permission at that moment. If it is denied, too slow or not supported,
// or not in the chosen city, use the simulated start point of the person's current city (from GET /cities). If that list is unknown, send no
// location and the server uses the home city. The device location is only ever sent to this app's own backend.
import { currentCityNow } from './cities';
import { isInCity, startPoint } from '../utils/cities';

const KEY = 'healthtwin_use_demo_location';

export function getUseDemo() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setUseDemo(on) {
  try {
    sessionStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* storage may be blocked */
  }
}

// The simulated start of the current city, labelled as simulated ("demo" is the name the API contract uses for it).
async function simulated(patientId) {
  const point = startPoint(await currentCityNow(patientId));
  return point ? { ...point, source: 'demo' } : null;
}

const STOP_KEY = 'healthtwin_stop_sharing';
// "Stop sharing": the person turned location sharing off for this emergency. Kept only for this browser tab.
export function isSharingStopped(emergencyId) {
  try { return sessionStorage.getItem(STOP_KEY) === String(emergencyId); } catch { return false; }
}
export function stopSharing(emergencyId) {
  try { sessionStorage.setItem(STOP_KEY, String(emergencyId)); } catch { /* storage may be blocked */ }
}
export function resumeSharing() {
  try { sessionStorage.removeItem(STOP_KEY); } catch { /* storage may be blocked */ }
}

// What the browser permission is right now: granted | denied | prompt | unsupported. Asking does not show a prompt.
export async function gpsPermission() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';
  try {
    if (!navigator.permissions || !navigator.permissions.query) return 'prompt';
    return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    return 'prompt';
  }
}

// Which line to show for a location (or null): 'gps' real device GPS, 'simulated' the practice start point, 'off' nothing is shared.
export function locationKind(location) {
  if (!location) return 'off';
  return location.source === 'gps' ? 'gps' : 'simulated';
}

export const GPS_TIMEOUT_MS = 8000;

// Returns a location object { lat, lng, accuracy, source } or null when sharing is off (or no city is known).
export function resolveLocation(consentGiven, patientId, emergencyId) {
  if (!consentGiven || (emergencyId && isSharingStopped(emergencyId))) return Promise.resolve(null);
  if (getUseDemo() || !navigator.geolocation) return simulated(patientId);
  return new Promise((resolve) => {
    const guard = setTimeout(() => resolve(simulated(patientId)), GPS_TIMEOUT_MS + 1000); // safety net if the browser never answers
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(guard);
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'gps' };
        // A device location that is not in the city the person chose (or in any city) is not used: the practice emergency
        // happens at that city's simulated start point instead, and the screens say "Simulated location in <city>".
        const city = await currentCityNow(patientId);
        resolve(city && !isInCity(city, here) ? simulated(patientId) : here);
      },
      () => {
        clearTimeout(guard);
        resolve(simulated(patientId));
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 }
    );
  });
}
