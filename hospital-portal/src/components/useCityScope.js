// Filters for the page the desk is on: hospitals, ambulances, alerts and cases of the chosen city only.
import { useMemo } from 'react';
import { useCity } from './CityProvider.jsx';
import { useHospitals } from './HospitalProvider.jsx';
import { filterAlerts, filterByCity } from '../services/cityScope.js';

export function useCityScope() {
  const { cityId, cities } = useCity();
  const { hospitals } = useHospitals();
  return useMemo(() => ({
    cityId,
    alerts: (list) => filterAlerts(list, cityId, hospitals, cities),
    byCity: (list) => filterByCity(list, cityId),
  }), [cityId, cities, hospitals]);
}
