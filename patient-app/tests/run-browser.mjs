// Runs every browser test against a throw-away copy of the app and the mock server on their own ports,
// so it never disturbs servers you already have running. Needs Chrome (CHROME_PATH, default /usr/bin/google-chrome).
//   npm run test:browser            all files
//   npm run test:browser -- passport   only files whose name contains "passport"
// Set TEST_NO_SERVERS=1 to use servers you started yourself (TEST_API_URL / TEST_APP_URL).
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const API = process.env.TEST_API_URL || 'http://localhost:4100';
const APP = process.env.TEST_APP_URL || 'http://localhost:5273';
const DEV = process.env.TEST_DEV_URL || 'http://localhost:5274';
const NORMAL = process.env.TEST_NORMAL_URL || 'http://localhost:5275'; // a build WITHOUT the demo panel
const children = [];
const stop = () => children.forEach((c) => c.kill());
process.on('exit', stop);

async function waitFor(url, label) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(label + ' did not start at ' + url);
}
const port = (url) => new URL(url).port;
const run = (cmd, args, options) => children.push(spawn(cmd, args, { stdio: 'ignore', ...options }));

if (!process.env.TEST_NO_SERVERS) {
  const env = { ...process.env, VITE_API_URL: API };
  console.log('Building the app for the tests (API ' + API + ')...');
  // The main test build has the demo panel on (VITE_DEMO_TOOLS=true); the second one is a normal build without it.
  const build = spawnSync('npx', ['vite', 'build', '--outDir', 'dist-test', '--emptyOutDir'], { cwd: app, env: { ...env, VITE_DEMO_TOOLS: 'true' }, stdio: 'ignore' });
  const normal = spawnSync('npx', ['vite', 'build', '--outDir', 'dist-normal', '--emptyOutDir'], { cwd: app, env, stdio: 'ignore' });
  if (build.status !== 0 || normal.status !== 0) { console.error('Build failed'); process.exit(1); }
  run('node', ['server.js'], { cwd: path.resolve(app, '../mock-server'), env: { ...env, PORT: port(API), DEMO_SPEED: '10', CORS_ORIGINS: [APP, DEV, NORMAL].join(',') } });
  run('npx', ['vite', 'preview', '--outDir', 'dist-test', '--port', port(APP), '--strictPort'], { cwd: app, env });
  run('npx', ['vite', 'preview', '--outDir', 'dist-normal', '--port', port(NORMAL), '--strictPort'], { cwd: app, env });
  run('npx', ['vite', '--port', port(DEV), '--strictPort'], { cwd: app, env });
  await waitFor(API + '/health', 'mock server'); await waitFor(APP + '/', 'app'); await waitFor(DEV + '/', 'dev server'); await waitFor(NORMAL + '/', 'normal build');
}

const only = process.argv[2];
const files = readdirSync(path.join(here, 'browser')).filter((f) => f.endsWith('.test.mjs') && (!only || only.split(',').some((o) => f.includes(o)))).sort();
const env = { ...process.env, TEST_API_URL: API, TEST_APP_URL: APP, TEST_DEV_URL: DEV, TEST_NORMAL_URL: NORMAL };
const summary = [];
for (const file of files) {
  console.log('\n=== ' + file + ' ===');
  const r = spawnSync('node', [path.join(here, 'browser', file)], { env, encoding: 'utf8' });
  const lines = (r.stdout || '').split('\n'); const total = lines.filter((l) => /^(PASS|FAIL) /.test(l)).length;
  if (process.env.VERBOSE) console.log(r.stdout);
  lines.filter((l) => l.startsWith('FAIL ')).forEach((l) => console.log(l)); if (r.status !== 0 && r.stderr) console.log(r.stderr.split('\n').slice(0, 6).join('\n'));
  console.log(r.status === 0 ? 'PASS  ' + file + ' (' + total + ' checks)' : 'FAIL  ' + file);
  summary.push([file, r.status === 0, total]);
}
console.log('\nBrowser tests: ' + summary.filter((s) => s[1]).length + '/' + summary.length + ' files passed, ' + summary.reduce((n, s) => n + s[2], 0) + ' checks');
process.exit(summary.every((s) => s[1]) ? 0 : 1);
