# Dependency audit (run these on your laptop)

**Status, 2026-11-14:** `npm ci` reports **0 vulnerabilities** on Puneet's laptop (reported by Puneet; the full output was not shown to the assistant) and in GitHub Actions (the log of the run for commit 8569d27 ends with `found 0 vulnerabilities`). That line is the short summary `npm ci` prints. A separate `npm audit` and `npm audit --omit=dev` have **not** been run since the react-router 7 upgrade, so run them once before quoting a full audit.

What was run by the assistant on 2026-11-14 (sandbox without access to the npm registry): `npm test` only. `npm audit`, `npm outdated` and `npm ci` could **not** run there. `package.json` and `package-lock.json` were **not changed** by the Part 1 to Part 4 work (checked with `git diff`), so the 2026-11-13 audit result below still describes the installed packages.

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
| 2026-11-13 | `npm audit --omit=dev` | 2 moderate, both `react-router` / `react-router-dom` 6.x (open redirect via backslash in `Link`/`useNavigate`; SSR hydration issue). Only fix offered: major upgrade to v7. | Upgraded to `react-router-dom` 7 (tested first on a separate branch). |
| 2026-11-13 | `npm audit` | Same 2 moderate before the upgrade. After the upgrade: **0 vulnerabilities**. | Checked after the upgrade: build ok, 269 unit tests, lint 0 errors (9 warnings), 8 of 8 e2e tests. `--force` was not used. |
| 2026-11-14 | `npm ci` on Puneet's laptop | **0 vulnerabilities** (as reported by Puneet; not seen by the assistant) | None needed. |
| 2026-11-14 | `npm ci` in GitHub Actions, workflow "Hospital portal checks", commit 8569d27 | `found 0 vulnerabilities` (the summary line of `npm ci`, read from the Actions log). Lint, 367 unit tests, build and 19 e2e tests were green in the same run. | None needed. A full `npm audit --omit=dev` is still to be run by hand. |
