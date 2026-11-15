import { afterEach, describe, expect, it, vi } from 'vitest';

const setup = ({ gl = true, reduced = false } = {}) => {
  globalThis.window = { WebGLRenderingContext: gl ? function () {} : undefined, matchMedia: () => ({ matches: reduced }) };
  globalThis.document = { createElement: () => ({ getContext: () => (gl ? {} : null) }) };
};
const load = async () => { vi.resetModules(); return import('../../src/utils/webgl'); }; // the answer is remembered, so each test starts fresh
afterEach(() => { delete globalThis.window; delete globalThis.document; vi.restoreAllMocks(); });

describe('3D capability', () => {
  it('opens 3D when the device can draw it and motion is not reduced', async () => { setup(); const { canWebGL, defaultView } = await load(); expect(canWebGL()).toBe(true); expect(defaultView()).toBe('3d'); });
  it('opens 2D when WebGL is missing', async () => { setup({ gl: false }); const { canWebGL, defaultView } = await load(); expect(canWebGL()).toBe(false); expect(defaultView()).toBe('2d'); });
  it('opens 2D when the person asks for less motion', async () => { setup({ reduced: true }); const { defaultView, prefersReducedMotion } = await load(); expect(prefersReducedMotion()).toBe(true); expect(defaultView()).toBe('2d'); });
  it('does not crash when the browser throws', async () => {
    setup(); globalThis.document = { createElement: () => { throw new Error('blocked'); } };
    const { canWebGL } = await load();
    expect(canWebGL()).toBe(false);
  });
  it('probes only once, however often it is asked, and hands the probe context back', async () => {
    setup(); const lose = vi.fn(); const getContext = vi.fn(() => ({ getExtension: () => ({ loseContext: lose }) }));
    globalThis.document = { createElement: () => ({ getContext }) };
    const { canWebGL } = await load();
    canWebGL(); canWebGL(); canWebGL();
    expect(getContext).toHaveBeenCalledTimes(1); expect(lose).toHaveBeenCalledTimes(1);
  });
});
