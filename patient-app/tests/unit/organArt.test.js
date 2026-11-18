import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ART, ORGAN_ORDER, artFor } from '../../src/config/organArt';
import { ORGANS } from '../../src/config/organs';

const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
const block = (start) => { const a = css.indexOf(start); return css.slice(a, css.indexOf('\n}', a)); };
const DARK = block("[data-theme='dark'] {");
const LIGHT = block(":root:not([data-theme='dark']), [data-theme='light'] {");
const token = (text, name) => { const m = text.match(new RegExp('--ht-' + name + ':\\s*(\\d+) (\\d+) (\\d+)')); return m ? m.slice(1).map(Number) : null; };
const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

const allPaths = () => Object.values(ART).flatMap((a) => Object.values(a).flat());

describe('organ drawings (2D body map)', () => {
  it('every organ of the twin has a drawing, and each organ shape gets one', () => {
    for (const o of ORGANS) {
      for (let i = 0; i < o.shapes.length; i += 1) expect(artFor(o.key, i), o.key + i).toBeTruthy();
    }
  });
  it('the lungs use two different drawings (three lobes on the person\'s right, a heart notch on the left); kidneys share one', () => {
    expect(artFor('lungs', 0)).not.toBe(artFor('lungs', 1));
    expect(artFor('kidneys', 0)).toBe(artFor('kidneys', 1));
  });
  it('the draw order lists every organ once, with the heart last so it is never hidden', () => {
    expect([...ORGAN_ORDER].sort()).toEqual(ORGANS.map((o) => o.key).sort());
    expect(ORGAN_ORDER[ORGAN_ORDER.length - 1]).toBe('heart');
  });
  it('every path is made only of SVG path commands and numbers (nothing else can slip in)', () => {
    const paths = allPaths();
    expect(paths.length).toBeGreaterThan(30);
    for (const d of paths) {
      expect(d, d).toMatch(/^[MmLlCcHhVvZz0-9.\-\s]+$/);
      expect(d.trim()[0], d).toMatch(/[Mm]/);
    }
  });
  it('closed shapes end with Z, and open lines (vessels, ducts, folds) do not need to', () => {
    for (const d of [...(ART.heart.outline), ...ART.liver.outline, ...ART.kidney.outline, ...ART.pancreas.outline, ...ART.brain.half, ...ART.lungRight.outline, ...ART.lungLeft.outline]) expect(d.trim().endsWith('Z'), d).toBe(true);
  });
  it('every organ has a colour in both themes, and its edge has at least 3:1 contrast on the card and the page tint', () => {
    for (const o of ORGANS) {
      for (const [name, text] of [['dark', DARK], ['light', LIGHT]]) {
        const c = token(text, 'organ-' + o.key);
        expect(c, name + ' ' + o.key).toBeTruthy();
        for (const bg of ['card', 'bg2']) expect(ratio(c, token(text, bg)), name + ' ' + o.key + ' on ' + bg).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('shapes stay inside the body outline (x 55-145, y 80-234 for the torso; the brain inside the head)', () => {
    for (const o of ORGANS) {
      for (const s of o.shapes) {
        const [x0, x1, y0, y1] = [s.cx - s.rx, s.cx + s.rx, s.cy - s.ry, s.cy + s.ry];
        if (o.key === 'brain') { expect(x0).toBeGreaterThan(79); expect(x1).toBeLessThan(121); expect(y0).toBeGreaterThan(5); expect(y1).toBeLessThan(55); }
        else { expect(x0, o.key).toBeGreaterThan(55); expect(x1, o.key).toBeLessThan(145); expect(y0, o.key).toBeGreaterThan(80); expect(y1, o.key).toBeLessThan(234); }
      }
    }
  });
});
