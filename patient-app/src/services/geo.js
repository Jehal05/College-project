// Finds the location to send with the SOS.
// Rules: consent off -> no location. Otherwise try the device GPS for 5 seconds. If it is denied, too slow or not supported,
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

// Returns a location object { lat, lng, accuracy, source } or null when sharing is off (or no city is known).
export function resolveLocation(consentGiven, patientId) {
  if (!consentGiven) return Promise.resolve(null);
  if (getUseDemo() || !navigator.geolocation) return simulated(patientId);
  return new Promise((resolve) => {
    const guard = setTimeout(() => resolve(simulated(patientId)), 6000); // safety net if the browser never answers
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
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}
