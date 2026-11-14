// Finds the location to send with the SOS.
// Rules: consent off -> no location. Otherwise try the device GPS for 5 seconds,
// and fall back to the demo location if it is denied, too slow, or not supported.
import { DEMO_LOCATION } from '../config/demo';

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

const demo = () => ({ ...DEMO_LOCATION, source: 'demo' });

// Returns a location object { lat, lng, accuracy, source } or null when sharing is off.
export function resolveLocation(consentGiven) {
  if (!consentGiven) return Promise.resolve(null);
  if (getUseDemo() || !navigator.geolocation) return Promise.resolve(demo());
  return new Promise((resolve) => {
    const guard = setTimeout(() => resolve(demo()), 6000); // safety net if the browser never answers
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(guard);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'gps' });
      },
      () => {
        clearTimeout(guard);
        resolve(demo());
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}
