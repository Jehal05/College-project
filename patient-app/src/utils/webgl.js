// Can this device draw 3D? And does the person ask for less motion? Both decide whether the 3D body is the default.
export function canWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
export const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Which view to open first: 3D only when it works and motion is not reduced.
export const defaultView = () => (canWebGL() && !prefersReducedMotion() ? '3d' : '2d');
