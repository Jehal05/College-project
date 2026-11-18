# Contributing

This is a three-person college project. Keep changes small and explain them in plain words.

## Branches
- `Puneet` (hospital portal, map, ambulance), `Jehal` (patient app, mock server), `Daksh` (backend): each person works on their own branch.
- `integration` is where the three parts meet. Open a pull request **into `integration`**, not straight into `main`.
- `main` gets changes from `integration` only after the team has reviewed them.

## Before you open a pull request
Run the checks for the part you changed (see `README.md`):

```
cd backend && DEMO_MODE=true python -m pytest -q
cd patient-app && npm run test:unit
cd hospital-portal && npm test && npm run lint && npm run build
```

## Rules
- No secrets in git: never commit a `.env` file, a key or a password.
- Do not write that something was tested, heard or seen unless a person did it.
- Medical wording and Hindi/Gujarati text stay marked as unreviewed until a doctor or native speaker signs them off (`docs/CLINICAL_REVIEW.md`, `docs/TRANSLATION_REVIEW.md`).
- Do not delete other people's files or docs without asking them.
