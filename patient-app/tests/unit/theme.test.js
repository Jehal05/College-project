import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeStorage() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

describe('theme choice', () => {
  beforeEach(() => { vi.resetModules(); globalThis.localStorage = fakeStorage(); });

  it('is dark by default and ignores junk', async () => {
    const { getTheme } = await import('../../src/utils/theme');
    expect(getTheme()).toBe('dark');
    localStorage.setItem('ht.theme', 'purple');
    expect(getTheme()).toBe('dark');
  });
  it('remembers light and tells listeners', async () => {
    const { getTheme, setTheme, subscribeTheme } = await import('../../src/utils/theme');
    const seen = vi.fn(); subscribeTheme(seen);
    setTheme('light');
    expect(getTheme()).toBe('light'); expect(seen).toHaveBeenCalled();
  });
  it('applies the theme to the document and falls back to dark for unknown words', async () => {
    const { applyTheme } = await import('../../src/utils/theme');
    const doc = { documentElement: { dataset: {} } };
    applyTheme('light', doc); expect(doc.documentElement.dataset.theme).toBe('light');
    applyTheme('nope', doc); expect(doc.documentElement.dataset.theme).toBe('dark');
  });
  it('still works when storage is blocked', async () => {
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    const { getTheme, setTheme } = await import('../../src/utils/theme');
    expect(getTheme()).toBe('dark'); expect(() => setTheme('light')).not.toThrow();
  });
});
