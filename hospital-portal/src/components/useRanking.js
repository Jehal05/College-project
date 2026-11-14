import { useMemo } from 'react';
import rankingConfig from '../data/ranking-config.json';
import { rankHospitals } from '../services/ranking.js';
import { originFor } from '../services/adapters.js';
import { useHospitals } from './HospitalProvider.jsx';

export const ESCALATION_SECONDS = rankingConfig.escalation_seconds || 30;

/** Ranking for an emergency type and patient location. Recomputed whenever hospital data changes. */
export function useRanking(type, location) {
  const { hospitals } = useHospitals();
  // No patient location shared? Measure from the middle of the hospitals instead of a fixed city.
  const origin = originFor({ location }, hospitals);
  const lat = origin?.lat;
  const lng = origin?.lng;
  return useMemo(() => (type ? rankHospitals(hospitals, type, { lat, lng }, rankingConfig) : null), [hospitals, type, lat, lng]);
}
