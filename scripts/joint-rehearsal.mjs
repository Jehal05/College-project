// Joint rehearsal: the REAL hospital portal (origin/Puneet) + the patient app + the mock in HOSPITAL_MODE=manual, in one browser.
// NOT part of `npm test` or CI because it needs Puneet's code. Nothing inside hospital-portal/ is edited or even checked out here:
// the portal is exported with `git archive` into a temp folder outside the repo.
//   node scripts/joint-rehearsal.mjs          (needs: git fetch origin, Chrome via CHROME_PATH, network for npm ci the first time)
// Set PORTAL_DIR=/some/folder to reuse an earlier export (skips npm ci). Scenarios a-g live in scripts/joint-scenarios.mjs.
import { spawn, spawnSync, execSync } from 'node:child_process';
import { mkdtempSync, existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { runScenarios } from './joint-scenarios.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'http://localhost:4300', PORTAL = 'http://localhost:5174', APP = 'http://localhost:5374';
const children = [];
process.on('exit', () => children.forEach((c) => c.kill()));
const sh = (cmd, args, options) => { const r = spawnSync(cmd, args, { stdio: 'inherit', ...options }); if (r.status !== 0) throw new Error(cmd + ' ' + args.join(' ') + ' failed'); };
const run = (cmd, args, options) => children.push(spawn(cmd, args, { stdio: 'ignore', ...options }));
async function waitFor(url) { for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 500)); } throw new Error('no answer from ' + url); }

// 1. Export the portal into a temp folder outside the repo, install and build it against the mock.
const tmp = process.env.PORTAL_DIR || mkdtempSync(path.join(os.tmpdir(), 'healthtwin-portal-'));
const portalDir = path.join(tmp, 'hospital-portal');
if (!existsSync(portalDir)) { mkdirSync(tmp, { recursive: true }); execSync('git archive origin/Puneet hospital-portal | tar -x -C ' + JSON.stringify(tmp), { cwd: root, shell: '/bin/bash' }); sh('npm', ['ci', '--no-audit', '--no-fund'], { cwd: portalDir }); }
console.log('Portal export: ' + portalDir + '  (commit ' + execSync('git rev-parse --short origin/Puneet', { cwd: root }).toString().trim() + ')');
const portalEnv = { ...process.env, VITE_USE_MOCK: 'false', VITE_API_BASE_URL: API, VITE_WS_URL: API.replace('http', 'ws') + '/ws' };
sh('npx', ['vite', 'build'], { cwd: portalDir, env: portalEnv, stdio: 'ignore' });
sh('npx', ['vite', 'build', '--outDir', 'dist-joint', '--emptyOutDir'], { cwd: path.join(root, 'patient-app'), env: { ...process.env, VITE_API_URL: API, VITE_DEMO_TOOLS: 'true' }, stdio: 'ignore' });

// 2. Start the mock (manual hospital mode, 5x speed) and serve both builds.
run('node', ['server.js'], { cwd: path.join(root, 'mock-server'), env: { ...process.env, PORT: '4300', HOSPITAL_MODE: 'manual', DEMO_SPEED: '5', CORS_ORIGINS: [PORTAL, APP].join(',') } });
run('npx', ['vite', 'preview', '--port', '5174', '--strictPort'], { cwd: portalDir, env: portalEnv });
run('npx', ['vite', 'preview', '--outDir', 'dist-joint', '--port', '5374', '--strictPort'], { cwd: path.join(root, 'patient-app'), env: process.env });
await waitFor(API + '/health'); await waitFor(PORTAL + '/'); await waitFor(APP + '/');

// 3. Drive both in one browser: a phone for the patient, a wide window for the hospital desk.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const results = await runScenarios({ browser, API, PORTAL, APP, shots: process.env.SHOTS_DIR });
await browser.close();
const failed = results.filter((r) => !r.pass).length;
console.log('\nJoint rehearsal: ' + (results.length - failed) + '/' + results.length + ' checks passed');
process.exit(failed ? 1 : 0);
