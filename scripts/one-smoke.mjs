// Quick check of the one-address server (start it first with `npm run one`): node scripts/one-smoke.mjs [http://localhost:4000]
const base = process.argv[2] || 'http://localhost:4000';
const want = [['/start', 'text/html', 'one address'], ['/', 'text/html', 'Patient App'], ['/hospitals', 'text/html', 'Patient App'],
  ['/portal/', 'text/html', 'Hospital Portal'], ['/portal/map', 'text/html', 'Hospital Portal'], ['/api/health', 'application/json', '"status":"ok"']];
let bad = 0;
for (const [path, type, text] of want) {
  const r = await fetch(base + path); const body = await r.text();
  const ok = r.status === 200 && (r.headers.get('content-type') || '').includes(type) && body.includes(text);
  console.log((ok ? 'PASS ' : 'FAIL ') + path); if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
