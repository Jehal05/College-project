// The theme colours must stay readable: WCAG AA contrast for text (4.5:1) and for icons/borders that carry meaning (3:1).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
const block = (selector) => {
  const m = css.match(new RegExp(selector.replace(/[[\]'()]/g, '\\$&') + '\\s*\\{([^}]*)\\}'));
  return Object.fromEntries([...m[1].matchAll(/--ht-(\w+):\s*(\d+) (\d+) (\d+);/g)].map((x) => [x[1], [+x[2], +x[3], +x[4]]]));
};
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const THEMES = { dark: block("[data-theme='dark']"), light: block(":root:not([data-theme='dark']), [data-theme='light']") };
const NAMES = ['bg', 'sidebar', 'card', 'line', 'accent', 'accent2', 'warning', 'emergency', 'emergencytext', 'text', 'muted', 'onaccent'];

describe('design tokens', () => {
  for (const [name, c] of Object.entries(THEMES)) {
    describe(name + ' theme', () => {
      it('defines every token', () => expect(NAMES.filter((n) => !c[n])).toEqual([]));
      it('text and muted text are readable on the background, cards and sidebar', () => {
        for (const bg of ['bg', 'card', 'sidebar']) for (const fg of ['text', 'muted']) expect(ratio(c[fg], c[bg]), fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5);
      });
      it('accent, healthy, caution and emergency colours are readable as text on the cards and background', () => {
        for (const bg of ['bg', 'card']) for (const fg of ['accent', 'accent2', 'warning', 'emergencytext']) expect(ratio(c[fg], c[bg]), fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5);
      });
      it('accent text stays readable on its own 10% and 15% tints (chips and selected buttons)', () => {
        const mix = (fg, bg, a) => fg.map((v, i) => Math.round(bg[i] * (1 - a) + v * a));
        for (const bg of ['bg', 'card']) for (const fg of ['accent', 'accent2']) for (const a of [0.1, 0.15]) expect(ratio(c[fg], mix(c[fg], c[bg], a)), fg + ' on ' + bg + ' tint ' + a).toBeGreaterThanOrEqual(4.5);
      });
      it('the emergency colour works as a fill, border or icon (3:1) on the background and cards', () => {
        for (const bg of ['bg', 'card']) expect(ratio(c.emergency, c[bg]), 'emergency on ' + bg).toBeGreaterThanOrEqual(3);
      });
      it('text on an accent button is readable', () => expect(ratio(c.onaccent, c.accent)).toBeGreaterThanOrEqual(4.5));
    });
  }
});
