import { afterEach, describe, expect, it, vi } from 'vitest';
import { canWebGL, defaultView, prefersReducedMotion } from '../../src/utils/webgl';

const setup = ({ gl = true, reduced = false } = {}) => {
  globalThis.window = { WebGLRenderingContext: gl ? function () {} : undefined, matchMedia: () => ({ matches: reduced }) };
  globalThis.document = { createElement: () => ({ getContext: () => (gl ? {} : null) }) };
};
afterEach(() => { delete globalThis.window; delete globalThis.document; vi.restoreAllMocks(); });

describe('3D capability', () => {
  it('opens 3D when the device can draw it and motion is not reduced', () => { setup(); expect(canWebGL()).toBe(true); expect(defaultView()).toBe('3d'); });
  it('opens 2D when WebGL is missing', () => { setup({ gl: false }); expect(canWebGL()).toBe(false); expect(defaultView()).toBe('2d'); });
  it('opens 2D when the person asks for less motion', () => { setup({ reduced: true }); expect(prefersReducedMotion()).toBe(true); expect(defaultView()).toBe('2d'); });
  it('does not crash when the browser throws', () => {
    setup(); globalThis.document = { createElement: () => { throw new Error('blocked'); } };
    expect(canWebGL()).toBe(false);
  });
});
