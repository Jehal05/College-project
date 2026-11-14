import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findHardcoded, stripComments } from './hardcoded.js';

const texts = (src) => findHardcoded(src).map((f) => f.text);

test('the scanner finds English typed into JSX', () => {
  assert.deepEqual(texts('const A = () => <b>Print</b>;'), ['Print']);
  assert.deepEqual(texts('<h2 className="x">Step durations</h2>'), ['Step durations']);
  assert.deepEqual(texts('<p>Why: {why}</p>'), ['Why:']);
  assert.ok(texts('<>Assigned: <b>{n}</b></>').includes('Assigned:'));
});
test('text with brackets is found, and code that looks like text is not', () => {
  assert.deepEqual(texts('<b>{n}</b> km (sample)</i>'.replace('</i>', '<i/>')), ['km (sample)']);
  assert.deepEqual(texts("<p>{n > 0 ? t('an.samples', { n }) : ''}</p>"), []);
});
test('it finds visible attributes and capitalised phrases in quotes', () => {
  assert.deepEqual(texts('<button aria-label="Close">x</button>'), ['Close']);
  assert.deepEqual(texts('<a title="Zoom in" />'), ['Zoom in']);
  assert.deepEqual(texts("const x = ok ? 'Not reached yet' : 'Total time';"), ['Not reached yet', 'Total time']);
});
test('it leaves translated text and code alone', () => {
  assert.deepEqual(texts("<b>{t('rp.title')}</b>"), []);
  assert.deepEqual(texts("<p className=\"text-lg\" data-testid=\"report-why\">{t('rk.why')} {x}</p>"), []);
  assert.deepEqual(texts("const f = (a) => a.map((x) => x.id);"), []);
  assert.deepEqual(texts("if (a > b) { go(); }"), []);
  assert.deepEqual(texts("import Foo from './Foo.jsx'; const k = L('tl.total', 'Total time');"), []);
  assert.deepEqual(texts("console.warn('Sound could not be switched on');"), []);
  assert.deepEqual(texts('const c = "flex items-center";'), []);
  assert.deepEqual(texts('<div className="rounded-xl p-3">{n}</div>'), []);
});
test('comments are ignored', () => {
  assert.deepEqual(texts('// Print the report\n/* Download (.txt) */\n{/* Sample roster */}\n<b>{t("x")}</b>'), []);
  assert.equal(stripComments('a // b\nc').split('\n').length, 2);
  assert.ok(stripComments("const u = 'http://x.test';").includes('http://x.test'));
});

// The real check: no .jsx file under src may show English typed straight into it unless it is listed (with a reason).
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allow = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'hardcodedAllow.json'), 'utf8'));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(SRC).filter((f) => f.endsWith('.jsx'));

test('no hardcoded English in .jsx files except the reviewed list (src/i18n/hardcodedAllow.json)', () => {
  const unlisted = [];
  for (const f of files) {
    const rel = path.relative(SRC, f).split(path.sep).join('/');
    const ok = new Set((allow[rel] || []).map((a) => a.text));
    for (const x of findHardcoded(fs.readFileSync(f, 'utf8'))) if (!ok.has(x.text)) unlisted.push(`${rel}:${x.line} "${x.text}"`);
  }
  assert.deepEqual(unlisted, [], `English text typed into JSX. Use t('...') and add the key to en, hi and gu, or list it in hardcodedAllow.json with a reason:\n${unlisted.join('\n')}`);
});

test('the reviewed list has no stale entries and every entry has a reason', () => {
  const stale = [];
  for (const [rel, list] of Object.entries(allow)) {
    const file = path.join(SRC, rel);
    const found = fs.existsSync(file) ? new Set(findHardcoded(fs.readFileSync(file, 'utf8')).map((x) => x.text)) : new Set();
    for (const a of list) {
      if (!a.reason || a.reason.length < 10) stale.push(`${rel} "${a.text}" has no reason`);
      if (!found.has(a.text)) stale.push(`${rel} "${a.text}" is no longer in the file`);
    }
  }
  assert.deepEqual(stale, []);
});
