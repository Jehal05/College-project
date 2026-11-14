// Remembers whether the hospital list came from the backend or from the saved sample file (hospitals.json).
// The banner reads this so the desk never mistakes an old sample list for live beds and units.
let fallback = false;
const listeners = new Set();
export const isHospitalFallback = () => fallback;
export function setHospitalFallback(next) {
  if (fallback === next) return;
  fallback = next;
  listeners.forEach((cb) => cb(fallback));
}
export function onHospitalFallback(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
