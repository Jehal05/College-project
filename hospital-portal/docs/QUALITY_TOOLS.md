# Lint and end-to-end tests: one-time setup on your laptop

The portal has an ESLint setup (`npm run lint`) and a Playwright browser test suite (`npm run e2e`).
The config files and tests are already in the repo. The packages are **not** yet in `package.json`, because adding them
without updating `package-lock.json` would make `npm ci` fail on GitHub. The two CI jobs (`lint`, `e2e`) are skipped
(not red) until the packages are there.

## Do this once (about 5 minutes)

```bash
cd hospital-portal
npm install --save-dev eslint@^9 @eslint/js@^9 globals@^15 eslint-plugin-react@^7 eslint-plugin-react-hooks@^5 @playwright/test@^1
npx playwright install chromium
npm run lint        # fix or report anything it finds
npm test            # unit tests
npm run e2e         # builds in mock mode, starts the preview server, runs the browser tests
git add package.json package-lock.json
git commit -m "quality-deps: add eslint and playwright dev dependencies"
git push
```

**Commit `package-lock.json` together with `package.json`.** If only one of them is committed, `npm ci` fails in CI.
After the push, GitHub Actions turns on the `lint` and `e2e` jobs by itself.

## What was and was not run before this was handed over

- Unit tests (`npm test`): run, all green.
- The browser tests in `e2e/` were run in a sandbox with a small stand-in for the `@playwright/test` API against a build of the portal made without Vite. They have **not** yet been run with the real `@playwright/test` and `vite preview`. The first real run is yours (or CI after you push). If one fails there, it is most likely a selector or timing detail, not a design problem.
- ESLint: run with ESLint 10 and the core recommended rules plus small stand-ins for `react/jsx-uses-vars`, `react/no-unescaped-entities` and `react/jsx-key`. The real `eslint-plugin-react` and `eslint-plugin-react-hooks` rules (especially `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`) were **not** run. Expect a few new findings the first time; `exhaustive-deps` is set to a warning.
