# Accessibility audit (Phase 4)

Checked on the built app at 360 px wide. Honest summary: automated checks and my own browser tests pass; **no test with a real screen reader (TalkBack, VoiceOver, NVDA) has been done.** That still needs a person.

## Automated: axe-core

`CHROME_PATH=/usr/bin/google-chrome npm run audit` (in `patient-app/`, with `npm run build && npm run preview` and the mock server running).
It opens 11 screens in English, Hindi and Gujarati (33 pages): login, home, profile, consent, contacts, reports, symptoms, demo, emergency countdown, emergency response, cancelled. It exits with code 1 on any serious or critical problem.

**Result: PASS, 0 violations** (WCAG 2.0/2.1 A and AA plus best-practice rules).

Problems found by the first run and fixed:

| Problem | Fix |
|---|---|
| `region`: the simulated banner sat outside any landmark | Banner is now an `<aside>`; the offline banner is inside `<main>` |
| `color-contrast`: inactive status pills used slate-500 | slate-700 text, active pill blue-700 |
| `label-content-name-mismatch`: "Make primary" button label did not start with its visible text | Label is now "Make primary: {{name}}" (and the Hindi/Gujarati equivalents) |

## Manual checks (browser tests, `t4_a11y.py`, 22 checks)

| Check | Result |
|---|---|
| First Tab key lands on "Skip to main content"; Enter moves focus to `<main>` | PASS |
| After a route change focus moves to the new page heading (h1) | PASS |
| Whole emergency flow with keyboard only (pick type, tick, Get help now) | PASS |
| Focus indicator visible (2 px outline; white ring on red buttons) | PASS |
| Touch targets at least 44 px on Home, Symptoms, Profile, Contacts, Consent | PASS (after making contact phone links 44 px tall) |
| 200% zoom (180 css px wide): no horizontal scroll on Home, Symptoms, Profile, Demo | PASS (after letting grids and tiles wrap) |
| `prefers-reduced-motion`: animations and transitions off, countdown still ticks | PASS |
| Live regions kept few: countdown announces only at 10, 5, 3, 2, 1; the "time since alert" clock is silent until milestones | PASS |
| Crash screen (ErrorBoundary): `role=alert`, `tel:112` link, simulated banner still visible, no stack trace shown | PASS |

## Rules followed in the code

- Colour is never the only signal: states have words ("Not sent yet", "Alert sent").
- Red is used only for the emergency flow.
- Every form field has a visible label; errors are text next to the field.
- The page language (`<html lang>`) follows the selected language.
- Minimum body text 16 px; 56 px for the main emergency buttons.

## Not covered / still to do

- Real screen-reader run-through in the three languages (Hindi and Gujarati pronunciation especially).
- Real phone testing of vibration, beep and voice input (the tests fake the speech engine).
- Windows high-contrast mode and forced colours.
