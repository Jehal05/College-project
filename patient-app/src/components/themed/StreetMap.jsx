// A real street map (OpenStreetMap tiles through Leaflet) with the numbered hospital pins and the simulated start point.
// The hospitals themselves are fictional; only the streets are real. Loaded on demand (see CityMap.jsx). If the tiles cannot be
// fetched (offline, blocked) the parent shows the drawn map instead. Pins use fixed names/numbers; the list next to it has the same facts as text.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION } from '../../config/external';

const pin = (html, cls) => L.divIcon({ className: 'ht-pin ' + cls, html, iconSize: [28, 28], iconAnchor: [14, 14] });

export default function StreetMap({ city, hospitals, start, label, onFail }) {
  const box = useRef(null);
  const latest = useRef({ hospitals, start, onFail });
  latest.current = { hospitals, start, onFail };
  // The map is rebuilt only when what it shows really changes (not on every render of the screen).
  const sig = [city && city.city_id, city && city.lat, city && city.lng, city && city.zoom, start && start.lat, start && start.lng,
    ...hospitals.map((h) => [h.id, h.lat, h.lng].join(':'))].join('|');
  useEffect(() => {
    if (!box.current || !city) return undefined;
    const { hospitals, start, onFail } = latest.current;
    const map = L.map(box.current, { zoomControl: true, attributionControl: true, keyboard: false, scrollWheelZoom: false }).setView([city.lat, city.lng], city.zoom || 12);
    let loaded = 0; let errors = 0;
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    tiles.on('tileload', () => { loaded += 1; });
    tiles.on('tileerror', () => { errors += 1; if (loaded === 0 && errors >= 3 && onFail) onFail(); });
    const points = [];
    hospitals.forEach((h, i) => {
      if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) return;
      L.marker([h.lat, h.lng], { icon: pin(String(i + 1), 'ht-pin-h'), keyboard: false, interactive: false }).addTo(map);
      points.push([h.lat, h.lng]);
    });
    if (start && Number.isFinite(start.lat)) { L.marker([start.lat, start.lng], { icon: pin('', 'ht-pin-s'), keyboard: false, interactive: false }).addTo(map); points.push([start.lat, start.lng]); }
    if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 15, animate: false });
    const fix = setTimeout(() => map.invalidateSize({ animate: false }), 300);
    return () => { clearTimeout(fix); map.stop(); map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return <div ref={box} role="group" aria-label={label} className="h-[360px] w-full overflow-hidden rounded-xl border border-ht-line" />;
}
