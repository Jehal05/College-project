import { MapContainer, TileLayer, Marker, Tooltip, Circle } from 'react-leaflet';
import { patientIcon } from './mapIcons.js';

/** Small map of the patient's reported location, shown in the detail panel. */
export default function PatientMiniMap({ location }) {
  if (!location) {
    return <div className="rounded-xl bg-slate-100 p-4 text-slate-500">The patient did not share a location.</div>;
  }
  const position = [location.lat, location.lng];
  return (
    <div className="h-56 overflow-hidden rounded-xl border border-slate-200">
      {/* key: Leaflet does not move the map when the centre prop changes, so remount per location */}
      <MapContainer key={position.join(',')} center={position} zoom={14} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={patientIcon}>
          <Tooltip direction="top" offset={[0, -12]}>Patient location (simulated)</Tooltip>
        </Marker>
        {location.accuracy_m ? (
          <Circle center={position} radius={location.accuracy_m} pathOptions={{ color: '#dc2626', weight: 1, fillOpacity: 0.1 }} />
        ) : null}
      </MapContainer>
    </div>
  );
}
