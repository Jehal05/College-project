// Prints the portal's ranking (src/services/ranking.js) as JSON for a fixed set of cases, so the backend's ranking can be
// compared on the SAME inputs (backend/scripts/compare_rankings.py runs this). Uses the portal's own hospital sample data.
import { readFileSync } from 'node:fs';
import { rankHospitals } from '../src/services/ranking.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const hospitals = read('../src/data/hospitals.json');
const config = read('../src/data/ranking-config.json');
const cases = JSON.parse(process.argv[2] || '[]');
const out = cases.map((c) => {
  const { ranked, ruledOut } = rankHospitals(hospitals, c.type, c.location, config);
  return { ...c, ranked: ranked.map((r) => ({ id: r.hospital.id, total: r.total, eta_min: r.eta_min, distance_km: r.distance_km })), ruled_out: ruledOut.map((r) => ({ id: r.hospital.id, reason: r.reason })) };
});
process.stdout.write(JSON.stringify(out));
