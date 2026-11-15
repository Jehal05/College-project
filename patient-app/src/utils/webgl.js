// Can this device draw 3D? And does the person ask for less motion? Both decide whether the 3D body is the default.
let cached; // asked once: every probe opens a graphics context, and browsers only allow a few at a time
export function canWebGL() {
  if (cached !== undefined) return cached;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    cached = Boolean(window.WebGLRenderingContext && gl);
    if (gl && gl.getExtension) { const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } // give the probe's context back at once
  } catch { cached = false; }
  return cached;
}
export const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Which view to open first: 3D only when it works and motion is not reduced.
export const defaultView = () => (canWebGL() && !prefersReducedMotion() ? '3d' : '2d');
