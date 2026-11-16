import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeStorage() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

describe('theme choice', () => {
  beforeEach(() => { vi.resetModules(); globalThis.localStorage = fakeStorage(); });

  it('is light by default (like a hospital website) and ignores junk', async () => {
    const { getTheme } = await import('../../src/utils/theme');
    expect(getTheme()).toBe('light');
    localStorage.setItem('ht.theme', 'purple');
    expect(getTheme()).toBe('light');
  });
  it('remembers dark and tells listeners', async () => {
    const { getTheme, setTheme, subscribeTheme } = await import('../../src/utils/theme');
    const seen = vi.fn(); subscribeTheme(seen);
    setTheme('dark');
    expect(getTheme()).toBe('dark'); expect(seen).toHaveBeenCalled();
  });
  it('applies the theme to the document and falls back to light for unknown words', async () => {
    const { applyTheme } = await import('../../src/utils/theme');
    const doc = { documentElement: { dataset: {} } };
    applyTheme('light', doc); expect(doc.documentElement.dataset.theme).toBe('light');
    applyTheme('nope', doc); expect(doc.documentElement.dataset.theme).toBe('light');
  });
  it('still works when storage is blocked', async () => {
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    const { getTheme, setTheme } = await import('../../src/utils/theme');
    expect(getTheme()).toBe('light'); expect(() => setTheme('dark')).not.toThrow();
  });
});
