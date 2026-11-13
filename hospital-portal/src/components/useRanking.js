import { useMemo } from 'react';
import rankingConfig from '../data/ranking-config.json';
import { rankHospitals } from '../services/ranking.js';
import { DEMO_LOCATION } from '../services/geo.js';
import { useHospitals } from './HospitalProvider.jsx';

export const ESCALATION_SECONDS = rankingConfig.escalation_seconds || 30;

/** Ranking for an emergency type and patient location. Recomputed whenever hospital data changes. */
export function useRanking(type, location) {
  const { hospitals } = useHospitals();
  const lat = location?.lat ?? DEMO_LOCATION.lat;
  const lng = location?.lng ?? DEMO_LOCATION.lng;
  return useMemo(() => (type ? rankHospitals(hospitals, type, { lat, lng }, rankingConfig) : null), [hospitals, type, lat, lng]);
}
