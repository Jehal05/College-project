// Leaflet icons shared by the hospital map, the patient mini map and the tracking map.
import L from 'leaflet';

export const patientIcon = L.divIcon({
  className: 'ht-marker',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#dc2626;border:4px solid #fff;
    box-shadow:0 0 0 4px rgba(220,38,38,.35)"></div>`,
});

export const hospitalPinIcon = L.divIcon({
  className: 'ht-marker',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<div style="width:34px;height:34px;border-radius:8px;background:#059669;color:#fff;font-weight:800;font-size:18px;
    display:grid;place-items:center;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">H</div>`,
});

/**
 * Ambulance marker with an arrow showing its heading (0 = north).
 * The heading is rounded to 15 degrees so the icon object stays the same on a straight
 * stretch; that lets the .ht-smooth CSS transition glide the marker between updates.
 */
const ambulanceIcons = new Map();
export function ambulanceIcon(heading = 0, label = '') {
  const rounded = (Math.round(heading / 15) * 15) % 360;
  const key = `${rounded}|${label}`;
  if (!ambulanceIcons.has(key)) {
    ambulanceIcons.set(
      key,
      L.divIcon({
        className: 'ht-marker ht-smooth',
        iconSize: [44, 62],
        iconAnchor: [22, 22],
        html: `<div data-heading="${rounded}" style="display:flex;flex-direction:column;align-items:center">
          <div style="width:44px;height:44px;border-radius:50%;background:#fff;border:4px solid #dc2626;display:grid;place-items:center;
            box-shadow:0 2px 8px rgba(0,0,0,.4)">
            <div style="transform:rotate(${rounded}deg);font-size:22px;line-height:1;color:#dc2626;font-weight:900">▲</div>
          </div>
          ${label ? `<div style="margin-top:2px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">${label}</div>` : ''}
        </div>`,
      }),
    );
  }
  return ambulanceIcons.get(key);
}
