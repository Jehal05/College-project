// Review sheet for native speakers: export every string to a CSV, and apply the corrections they type back in.
// Pure functions only (no files): scripts/export-translations.mjs and scripts/import-translations.mjs do the reading and writing.
// Tests: reviewCsv.test.js.

// ---------- CSV ----------
const QUOTE_NEEDED = /[",\r\n]|^\s|\s$/;
const cell = (v) => {
  const s = String(v ?? '');
  return QUOTE_NEEDED.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Rows (arrays of text) to CSV text with Windows line ends, which spreadsheet programs expect. */
export const toCsv = (rows) => rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

/** CSV text to rows. Handles a leading byte-order mark, quoted cells, "" for a quote, and line breaks inside quotes. */
export function parseCsv(text) {
  const src = String(text).replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (inQuotes) throw new Error('The CSV has a quote that is never closed.');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === '')); // blank lines
}

// ---------- placeholders and rules ----------
/** The {names} in a string, sorted (so {a} {b} equals {b} {a}). */
export const placeholders = (s) => (String(s).match(/\{[A-Za-z0-9_]+\}/g) || []).sort();
const samePlaceholders = (a, b) => placeholders(a).join('|') === placeholders(b).join('|');

// Medical terms: the reviewer takes extra care with these (emergency types, capabilities, severities, warnings, clinical words).
export const MEDICAL_PREFIXES = ['type.', 'cap.', 'capl.', 'sev.', 'warn.'];
const MEDICAL_WORDS = /cath lab|stroke|\bICU\b|heart|cardiac|breath|vital|SpO|\bECG\b|defibrillat|\bCPR\b|allerg|medicine|medication|diagnos|emergency department|ambulance|oxygen|bleed|unconscious/i;
export const isMedical = (key, english) => MEDICAL_PREFIXES.some((p) => key.startsWith(p)) || MEDICAL_WORDS.test(english);

const SCRIPTS = { hi: /[ऀ-ॿ]/, gu: /[઀-૿]/ };
const LANG_OF_COLUMN = { hindi_fixed: 'hi', gujarati_fixed: 'gu' };
const LANG_NAME = { hi: 'Hindi', gu: 'Gujarati' };

// ---------- source files (src/i18n/hi.js) ----------
const ENTRY = /^  '((?:[^'\\]|\\.)+)': '((?:[^'\\]|\\.)*)',$/gm;
const unescapeJs = (s) => s.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c));
/** A string as it is written between single quotes in the source file. */
export const escapeJs = (v) => String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Keys and values written in a dictionary file, in order. */
export function parseDict(source) {
  const out = new Map();
  for (const m of source.matchAll(ENTRY)) out.set(unescapeJs(m[1]), unescapeJs(m[2]));
  return out;
}

/** Page names where each key is used. `files` = [{ rel: 'pages/Report.jsx', text }] from src/ (not the i18n folder). */
export function pagesByKey(keys, files) {
  const label = (rel) => {
    const name = rel.replace(/\.(jsx?|mjs)$/, '').split('/').pop();
    return rel.startsWith('pages/') ? { text: name, page: true } : { text: name, page: false };
  };
  const info = files.map((f) => ({
    ...label(f.rel),
    text0: f.text,
    prefixes: [...f.text.matchAll(/`([\w.]+)\.\$\{/g)].map((m) => `${m[1]}.`),
  }));
  const result = {};
  for (const key of keys) {
    const hit = info.filter((f) => f.text0.includes(`'${key}'`) || f.text0.includes(`"${key}"`) || f.prefixes.some((p) => key.startsWith(p)));
    const names = [...new Set([...hit.filter((h) => h.page), ...hit.filter((h) => !h.page)].map((h) => h.text))];
    result[key] = names.length === 0 ? '(not found in code)' : names.length > 4 ? `${names.slice(0, 4).join(', ')} +${names.length - 4} more` : names.join(', ');
  }
  return result;
}

export const REVIEW_COLUMNS = ['key', 'page', 'medical', 'keep_exactly', 'english', 'hindi', 'gujarati', 'hindi_fixed', 'gujarati_fixed', 'note'];

/** The review sheet as CSV text (with a byte-order mark so Excel shows Hindi and Gujarati correctly). */
export function buildReviewCsv({ en, hi, gu, pages = {} }) {
  const rows = [REVIEW_COLUMNS];
  for (const key of Object.keys(en)) {
    rows.push([key, pages[key] || '', isMedical(key, en[key]) ? 'MEDICAL' : '', placeholders(en[key]).join(' '), en[key], hi[key] ?? '', gu[key] ?? '', '', '', '']);
  }
  return `﻿${toCsv(rows)}`;
}

// ---------- reading the corrections ----------
const edge = (s) => ({ lead: s.match(/^\s*/)[0], trail: s.match(/\s*$/)[0] });

/**
 * Check a filled CSV against the current dictionaries. Nothing is written here.
 * @returns {{ changes: {lang:string,key:string,value:string,old:string,note:string}[], problems: string[], warnings: string[], unchanged: number, emptyCells: number }}
 */
export function readCorrections(csvText, dicts) {
  const { en, hi, gu } = dicts;
  const current = { hi, gu };
  const problems = [];
  const warnings = [];
  let rows;
  try { rows = parseCsv(csvText); } catch (err) { return { changes: [], problems: [err.message], warnings, unchanged: 0, emptyCells: 0 }; }
  if (rows.length === 0) return { changes: [], problems: ['The CSV is empty.'], warnings, unchanged: 0, emptyCells: 0 };
  const header = rows[0].map((h) => h.trim());
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  for (const need of ['key', 'english', 'hindi_fixed', 'gujarati_fixed']) {
    if (!(need in col)) problems.push(`The CSV has no "${need}" column. Use the file made by the export script.`);
  }
  if (problems.length) return { changes: [], problems, warnings, unchanged: 0, emptyCells: 0 };

  const changes = [];
  const seen = new Set();
  let unchanged = 0;
  let emptyCells = 0;
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const key = (r[col.key] ?? '').trim();
    const wantsFix = Object.keys(LANG_OF_COLUMN).some((c) => (r[col[c]] ?? '').trim() !== '');
    if (!wantsFix) { emptyCells += 2; return; }
    if (!(key in en)) { problems.push(`Line ${line}: "${key}" is not a key in the portal.`); return; }
    if (seen.has(key)) { problems.push(`Line ${line}: "${key}" appears twice with a correction. Keep one row per key.`); return; }
    seen.add(key);
    // spreadsheets may drop spaces at the ends of a cell, so compare without them
    if (col.english !== undefined && (r[col.english] ?? '').trim() !== en[key].trim()) {
      problems.push(`Line ${line}: "${key}" has different English than the portal now. The sheet is out of date; export it again.`);
      return;
    }
    for (const [column, lang] of Object.entries(LANG_OF_COLUMN)) {
      const raw = r[col[column]] ?? '';
      if (raw.trim() === '') { emptyCells += 1; continue; }
      const where = `Line ${line} (${key}, ${LANG_NAME[lang]})`;
      if (/[\r\n]/.test(raw)) { problems.push(`${where}: the correction has a line break. Use one line.`); continue; }
      const { lead, trail } = edge(en[key]);
      const value = `${lead}${raw.trim()}${trail}`; // keep the spaces the English has at its ends ("Warning: ")
      if (!samePlaceholders(en[key], value)) {
        problems.push(`${where}: the placeholders changed. English has [${placeholders(en[key]).join(' ') || 'none'}], the correction has [${placeholders(value).join(' ') || 'none'}]. Keep them exactly.`);
        continue;
      }
      const missing = ['Simulated', 'simulated'].filter((w) => en[key].includes(w) && !value.includes(w));
      if (missing.length) { problems.push(`${where}: the word "${missing[0]}" must stay in English.`); continue; }
      if (value === current[lang][key]) { unchanged += 1; continue; }
      if (SCRIPTS[lang] && !SCRIPTS[lang].test(value) && /[A-Za-z]{3,}/.test(en[key].replace(/\{[^}]*\}/g, ''))) {
        warnings.push(`${where}: the correction has no ${LANG_NAME[lang]} letters. It was accepted; check it is meant to be that way.`);
      }
      changes.push({ lang, key, value, old: current[lang][key], note: (r[col.note] ?? '').trim() });
    }
  });
  return { changes, problems, warnings, unchanged, emptyCells };
}

/**
 * Put the new values into the text of one dictionary file. Only the value inside the quotes of each changed key is touched.
 * Throws if the result would not have exactly the same keys, or if any other value would change.
 */
export function applyToSource(source, changes) {
  const before = parseDict(source);
  let out = source;
  for (const { key, value } of changes) {
    if (/[\r\n]/.test(value)) throw new Error(`"${key}": a value cannot have a line break.`);
    const re = new RegExp(`^(  '${escapeJs(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}': )'(?:[^'\\\\]|\\\\.)*',$`, 'gm');
    const hits = out.match(re) || [];
    if (hits.length !== 1) throw new Error(`"${key}" was found ${hits.length} times in the file; expected once.`);
    out = out.replace(re, (_m, head) => `${head}'${escapeJs(value)}',`);
  }
  const after = parseDict(out);
  const changed = new Map(changes.map((c) => [c.key, c.value]));
  if ([...before.keys()].join('\u0000') !== [...after.keys()].join('\u0000')) throw new Error('The key list changed. Nothing was written.');
  for (const [k, v] of after) if (v !== (changed.has(k) ? changed.get(k) : before.get(k))) throw new Error(`"${k}" came out different from what was planned. Nothing was written.`);
  return out;
}
