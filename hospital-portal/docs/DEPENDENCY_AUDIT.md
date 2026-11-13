# Dependency audit (run these on your laptop)

**Status: not run yet.** This file lists the exact commands. No audit result is written here because none was produced:
the environment this was prepared in cannot reach the npm registry, so `npm audit` could not run. Do not quote a result until you have run it.

## 1. Check for known vulnerabilities

```bash
cd hospital-portal
npm ci                         # install exactly what package-lock.json says
npm audit                      # all dependencies
npm audit --omit=dev           # only what ships to users (react, leaflet, router)
npm audit --json > audit.json  # keep a copy to show the jury or your teacher
```

Read the output like this:
- **Severity** low / moderate / high / critical. Fix high and critical in `dependencies` first.
- Many findings are in build tools (`vite`, `esbuild`, `eslint`). They run on your laptop and in CI, not in the browser, so they matter less for the demo. Say so honestly if asked.
- `npm audit fix` applies safe (same major version) updates. Do **not** use `npm audit fix --force` before the demo; it can jump major versions and break the build.

## 2. Check what is out of date

```bash
npm outdated
```

## 3. Check licences (needed if the project is ever published)

```bash
npx license-checker --summary --production
```

## 4. After any update

```bash
npm test && npm run build && npm run lint && npm run e2e
```
Commit `package.json` **and** `package-lock.json` together.

## 5. Write the result here

Copy this table, fill it in with real numbers from your own run, and commit it.

| Date | Command | Result (counts by severity) | Action taken |
|---|---|---|---|
| | `npm audit --omit=dev` | | |
| | `npm audit` | | |
