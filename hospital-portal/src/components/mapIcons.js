// Leaflet icons shared by the hospital map and the patient mini map.
import L from 'leaflet';

export const patientIcon = L.divIcon({
  className: 'ht-marker',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#dc2626;border:4px solid #fff;
    box-shadow:0 0 0 4px rgba(220,38,38,.35)"></div>`,
});
