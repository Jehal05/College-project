// ONE ADDRESS for the whole project: builds the patient app and the hospital portal (only when needed) and starts one server
// that serves both plus the simulated API. Run:  npm run one      (add --rebuild to force a fresh build)
// The builds go to their own folder (dist-one) so an ordinary `npm run build` (dist) can never be served by mistake.
// Then open http://localhost:4000/start. Environment: PORT (default 4000), DEMO_SPEED (default 5), HOSPITAL_MODE (default manual).
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rebuild = process.argv.includes('--rebuild');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (cmd, args, cwd, env = {}) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('\nStep failed: ' + cmd + ' ' + args.join(' ')); process.exit(r.status || 1); }
};
const newest = (dir) => { // newest modification time of any file under dir (skips node_modules and dist)
  let t = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'dist-one', 'dist-audit', '.git'].includes(e.name)) continue;
    const p = join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return t;
};
const stale = (app) => rebuild || !existsSync(join(root, app, 'dist-one', 'index.html')) || statSync(join(root, app, 'dist-one', 'index.html')).mtimeMs < newest(join(root, app));

if (!existsSync(join(root, 'node_modules'))) run(npm, ['install'], root);
if (!existsSync(join(root, 'hospital-portal', 'node_modules'))) run(npm, ['ci'], join(root, 'hospital-portal'));
if (stale('patient-app')) {
  console.log('\n== Building the patient app ==');
  run(npm, ['run', 'build', '-w', 'patient-app', '--', '--outDir', 'dist-one', '--emptyOutDir'], root, { VITE_API_URL: '/api', VITE_WS_URL: '', VITE_DEMO_TOOLS: 'true' });
}
if (stale('hospital-portal')) {
  console.log('\n== Building the hospital portal ==');
  run(npm, ['run', 'build', '--', '--outDir', 'dist-one', '--emptyOutDir'], join(root, 'hospital-portal'), { PORTAL_BASE: '/portal/', VITE_USE_MOCK: 'false', VITE_API_BASE_URL: '/api', VITE_WS_URL: '/ws', VITE_PORTAL_SIMULATES_AMBULANCE: 'auto' });
}
const port = process.env.PORT || '4000';
console.log('\n== Starting the server ==');
const child = spawn(process.execPath, ['server.js'], {
  cwd: join(root, 'mock-server'), stdio: 'inherit',
  env: { ...process.env, SERVE_APPS: 'true', PORT: port, DEMO_SPEED: process.env.DEMO_SPEED || '5', HOSPITAL_MODE: process.env.HOSPITAL_MODE || 'manual' },
});
child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
