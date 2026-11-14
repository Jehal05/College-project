// npm run i18n:import -- translations-review.csv [--dry-run] [--skip-invalid]
// Applies the filled hindi_fixed / gujarati_fixed cells to src/i18n/hi.js and gu.js. Empty cells change nothing.
// A row that changes a {placeholder}, drops the word "Simulated", or comes from an out-of-date sheet is rejected.
// By default, if any row is rejected nothing is written. --skip-invalid applies the good rows and lists the rest.
import { readFileSync, writeFileSync } from 'node:fs';
import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';
import gu from '../src/i18n/gu.js';
import { applyToSource, parseDict, readCorrections } from '../src/i18n/reviewCsv.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry-run');
const skipInvalid = args.includes('--skip-invalid');
if (!file) { console.error('Usage: npm run i18n:import -- translations-review.csv [--dry-run] [--skip-invalid]'); process.exit(2); }

const result = readCorrections(readFileSync(file, 'utf8'), { en, hi, gu });
for (const w of result.warnings) console.log(`WARNING  ${w}`);
for (const p of result.problems) console.error(`REJECTED ${p}`);
if (result.problems.length && !skipInvalid) {
  console.error(`\n${result.problems.length} problem(s). Nothing was written. Fix the sheet, or use --skip-invalid to apply only the good rows.`);
  process.exit(1);
}
for (const c of result.changes) if (c.note) console.log(`NOTE     ${c.key} (${c.lang}): ${c.note}`);

const targets = { hi: new URL('../src/i18n/hi.js', import.meta.url), gu: new URL('../src/i18n/gu.js', import.meta.url) };
const counts = { hi: 0, gu: 0 };
const written = {};
for (const lang of ['hi', 'gu']) {
  const changes = result.changes.filter((c) => c.lang === lang);
  if (changes.length === 0) continue;
  const source = readFileSync(targets[lang], 'utf8');
  if (parseDict(source).size !== Object.keys(en).length) { console.error(`${lang}.js has lines this script cannot read. Nothing was written.`); process.exit(1); }
  written[lang] = applyToSource(source, changes); // throws (and nothing is written) if the key list would change
  counts[lang] = changes.length;
}
if (!dry) for (const [lang, text] of Object.entries(written)) writeFileSync(targets[lang], text);
console.log(`${dry ? 'DRY RUN, nothing written. Would change' : 'Changed'}: Hindi ${counts.hi}, Gujarati ${counts.gu}. Same as before: ${result.unchanged}. Empty cells: ${result.emptyCells}.`);
if (!dry && (counts.hi || counts.gu)) console.log('Now run: npm test   (then commit src/i18n/hi.js and src/i18n/gu.js)');
