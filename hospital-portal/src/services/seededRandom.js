// Optional repeatable randomness for the mock (VITE_MOCK_SEED). With a seed, "Simulate new alert" gives the same
// sequence of cases every run, which is handy for a rehearsed demo and for tests. Without a seed it is plain Math.random.
export function makeRandom(seed) {
  const text = String(seed ?? '').trim();
  if (text === '' || !Number.isFinite(Number(text))) return Math.random;
  let a = Number(text) >>> 0; // mulberry32
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
