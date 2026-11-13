// The simulated route for an emergency: ambulance base -> patient -> alerted hospital.
// The trip runner and the tracking map both use this, so they always draw the same path.
import { buildPath, cumulativeKm } from '../sim/ambulance-route.js';
import { DEMO_LOCATION } from '../services/geo.js';
import { originFor } from '../services/adapters.js';

/**
 * @param emergency  needs ambulance_id, location, alerted_hospital_id
 * @param units      ambulance list (base positions)
 * @param hospitals  hospital list
 * @param fallbackHospitalId  used when the emergency has no alerted hospital
 * @returns { points, pickupIndex, cumulative, totalKm, ambulance, hospital, patient } or null
 */
export function routeForEmergency(emergency, units, hospitals, fallbackHospitalId) {
  const ambulance = units.find((u) => u.id === emergency?.ambulance_id);
  const hospital =
    hospitals.find((h) => h.id === emergency?.alerted_hospital_id) || hospitals.find((h) => h.id === fallbackHospitalId) || hospitals[0];
  if (!ambulance || !hospital) return null;
  const patient = originFor(emergency, hospitals) || DEMO_LOCATION; // patient's location, else the middle of the hospitals
  const start = ambulance.base || ambulance; // base position, not the live one
  const { points, pickupIndex } = buildPath(start, patient, hospital);
  const cumulative = cumulativeKm(points);
  return { points, pickupIndex, cumulative, totalKm: cumulative[cumulative.length - 1], ambulance, hospital, patient };
}
