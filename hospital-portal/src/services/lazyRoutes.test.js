import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guard: pages must stay lazy-loaded, so one page's code is not shipped with every other page.
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

test('every page in src/pages is loaded with React.lazy, never with a plain import', () => {
  for (const m of app.matchAll(/^import\s+\w+\s+from\s+'\.\/pages\/([^']+)'/gm)) assert.fail(`App.jsx imports pages/${m[1]} directly`);
  const lazyPages = [...app.matchAll(/lazy\(\(\) => import\('\.\/pages\/(\w+)\.jsx'\)\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(lazyPages, ['Activity', 'Admin', 'Analytics', 'Crew', 'Dashboard', 'Fleet', 'History', 'Login', 'Map', 'Report']);
});

test('the lazy pages sit inside Suspense so a slow chunk shows a message, not a blank screen', () => {
  assert.ok((app.match(/<Suspense\b/g) || []).length >= 3);
});
