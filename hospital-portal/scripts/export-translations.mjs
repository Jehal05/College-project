// npm run i18n:export  ->  writes translations-review.csv (or the path after --out) for a Hindi and a Gujarati reader.
// The reader fills hindi_fixed / gujarati_fixed only where something is wrong, and sends the file back.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import gu from '../src/i18n/gu.js';
import { buildReviewCsv, isMedical, pagesByKey } from '../src/i18n/reviewCsv.js';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const files = walk(SRC)
  .filter((f) => /\.(jsx?|mjs)$/.test(f) && !f.includes(`${sep}i18n${sep}`) && !/\.test\.js$/.test(f))
  .map((f) => ({ rel: relative(SRC, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));

const outArg = process.argv.indexOf('--out');
const out = outArg > -1 ? process.argv[outArg + 1] : 'translations-review.csv';
const pages = pagesByKey(Object.keys(en), files);
writeFileSync(out, buildReviewCsv({ en, hi, gu, pages }));
const medical = Object.keys(en).filter((k) => isMedical(k, en[k])).length;
console.log(`Wrote ${out}: ${Object.keys(en).length} strings, ${medical} marked MEDICAL (extra care).`);
console.log('Open it in Excel or Google Sheets (UTF-8). Fill hindi_fixed / gujarati_fixed only where a correction is needed.');
