// Tiny stand-ins for the browser parts the code touches, so no extra test packages are needed.
// Items are own properties (like the real Storage), so Object.keys(sessionStorage) works; the methods are hidden.
const store = () => {
  const s = {};
  const methods = {
    getItem: (k) => (Object.hasOwn(s, k) ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: (k) => { delete s[k]; },
    clear: () => Object.keys(s).forEach((k) => delete s[k]),
  };
  for (const [name, fn] of Object.entries(methods)) Object.defineProperty(s, name, { value: fn, enumerable: false });
  return s;
};
globalThis.localStorage = store();
globalThis.sessionStorage = store();
globalThis.document = { documentElement: {}, hidden: false };
globalThis.window = globalThis;
globalThis.window.location = { pathname: '/', origin: 'http://localhost:5173' };
