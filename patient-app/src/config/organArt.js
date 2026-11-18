// The drawings of the six organs for the 2D body map. Pure data (SVG path strings), so they are easy to change and to test.
// Each drawing sits in a unit box (-1..1, y down) and is scaled to the size in config/organs.js. They are ORIGINAL, simplified
// illustrations drawn by hand for this app (no copied anatomy pictures). Educational shapes, not a medical image.
//   outline: closed shapes (filled and outlined)      detail: thin lines inside (fissures, folds, grooves)
//   tubes:   thick rounded lines (blood vessels)        ducts: thin rounded lines outside the outline
// Heart and kidneys are drawn once; the map flips the second kidney. The lungs have two drawings (the person's right lung
// has three lobes; the left has two and a notch for the heart) and the windpipe is drawn once between them.

export const ORGAN_ORDER = ['lungs', 'kidneys', 'liver', 'pancreas', 'brain', 'heart']; // back to front, so the heart is never hidden

export const ART = {
  heart: {
    outline: ['M-.05 -.42 C-.34 -.78 -.95 -.62 -.92 -.05 C-.88 .42 -.36 .7 .1 .96 C.56 .62 .96 .22 .86 -.2 C.76 -.6 .3 -.74 -.05 -.42 Z'],
    detail: ['M-.04 -.38 C-.14 .1 .02 .52 .1 .92', 'M-.62 -.3 C-.7 .05 -.5 .35 -.3 .5'],
    tubes: ['M-.12 -.44 C-.12 -.86 .1 -1.02 .36 -.96 C.58 -.9 .62 -.7 .52 -.52', 'M.12 -.5 C.2 -.78 .44 -.74 .5 -.52', 'M-.42 -.5 L-.42 -.92'],
  },
  lungRight: {
    outline: ['M.55 -1 C.15 -1 -.42 -.8 -.76 -.2 C-1 .35 -.9 .85 -.5 .96 C-.1 1 .5 .96 .8 .86 C1 .6 .95 .1 .8 -.3 C.75 -.66 .8 -1 .55 -1 Z'],
    detail: ['M-.9 .04 C-.4 -.08 .2 -.1 .86 -.26', 'M.05 -.62 C-.1 -.1 -.3 .4 -.58 .92'],
  },
  lungLeft: {
    outline: ['M-.5 -1 C-.1 -1 .45 -.8 .78 -.2 C1 .36 .9 .85 .5 .96 C.15 1 -.35 .97 -.7 .88 C-.95 .8 -.55 .45 -.6 .15 C-.62 -.2 -.85 -.45 -.8 -.7 C-.75 -.95 -.7 -1 -.5 -1 Z'],
    detail: ['M.62 -.44 C.12 -.1 -.2 .3 -.42 .88'],
  },
  windpipe: {   // absolute map coordinates (not a unit box): trachea, two main bronchi and a few branches
    ducts: ['M103 80 V99', 'M103 99 L91 112', 'M103 99 L115 112', 'M97 106 L86 101', 'M93 110 L82 112', 'M91 112 L85 121', 'M109 106 L120 101', 'M113 110 L124 112', 'M115 112 L121 121'],
  },
  brain: {      // seen from the front: two folded halves, a cerebellum under them and the brain stem
    half: ['M-.04 -.92 C-.25 -1.02 -.55 -.95 -.7 -.75 C-.95 -.7 -1.05 -.4 -.95 -.2 C-1.1 0 -1 .35 -.8 .45 C-.75 .65 -.55 .7 -.4 .62 C-.3 .78 -.1 .8 -.04 .7 Z'],
    folds: ['M-.2 -.76 C-.36 -.56 -.14 -.42 -.4 -.3', 'M-.6 -.56 C-.44 -.4 -.66 -.26 -.5 -.1', 'M-.86 -.3 C-.7 -.14 -.86 0 -.7 .16', 'M-.3 -.04 C-.14 .1 -.36 .26 -.2 .46', 'M-.58 .12 C-.44 .26 -.6 .38 -.5 .5'],
    cerebellum: ['M-.72 .46 C-.74 .96 -.3 1.08 -.04 .94 L-.04 .5 Z'],
    stem: ['M-.12 .72 C-.15 1 -.1 1.18 0 1.18 C.1 1.18 .15 1 .12 .72 Z'],
    cerebellumLine: ['M-.72 .46 C-.74 .96 -.3 1.08 -.04 .94'],   // the outer edges only: no line where the cerebellum and the stem meet the halves
    stemLine: ['M-.12 .72 C-.15 1 -.1 1.18 0 1.18 C.1 1.18 .15 1 .12 .72'],
  },
  liver: {
    outline: ['M-1 -.1 C-.9 -.8 -.3 -1 .3 -.85 C.75 -.75 1 -.3 .95 .05 C.9 .25 .6 .3 .35 .46 C.1 .86 -.4 1 -.75 .7 C-.95 .5 -1 .2 -1 -.1 Z'],
    detail: ['M.22 -.88 C.14 -.3 .2 .1 .32 .5'],
    extra: ['M-.3 .78 C-.34 1.06 -.04 1.14 -.02 .86 Z'],   // gallbladder
  },
  kidney: {     // the notch (hilum) faces +x; the map flips the one on the other side
    outline: ['M.1 -1 C.75 -.95 1 -.4 .8 -.05 C.55 .1 .55 .2 .8 .4 C.95 .8 .6 1.05 .15 1 C-.6 .95 -1 .5 -.95 -.05 C-.9 -.65 -.5 -1 .1 -1 Z'],
    detail: ['M.42 .02 C.1 .08 .1 .3 .42 .36'],
    ducts: ['M.58 .42 C.48 .66 .54 .9 .46 1.2'],
  },
  pancreas: {   // head (left) next to the first part of the gut, body, and a tail that rises to the right
    outline: ['M-1 .1 C-1 -.5 -.6 -.7 -.3 -.35 C0 -.05 .4 -.35 .75 -.8 C.95 -1 1.05 -.6 .9 -.3 C.6 .4 .1 .7 -.3 .65 C-.7 .95 -1 .7 -1 .1 Z'],
    detail: ['M-.8 .12 C-.3 .16 .3 -.1 .85 -.65'],
  },
};

/** What one drawn shape of an organ needs: which drawing, and the pieces. `index` is the position in config shapes. */
export function artFor(key, index) {
  if (key === 'lungs') return index === 0 ? ART.lungRight : ART.lungLeft;   // the first shape is on the viewer's left = the person's right
  if (key === 'kidneys') return ART.kidney;
  return ART[key] || null;
}
