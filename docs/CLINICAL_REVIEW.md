# Clinical review: how a doctor signs off the emergency guidance

**Status: nothing has been reviewed.** Every condition-specific instruction is hidden. The app shows only three general lines until a doctor approves more. This prototype never diagnoses.

## What the doctor reviews

The files are in `patient-app/src/config/` and `patient-app/src/i18n/`:

1. **The three general lines** shown in every emergency: `instructions.general1`, `general2`, `general3` in `src/i18n/en.json` (call 112 / 108, unlock the door and tell someone nearby, stay where you are because your hospital has been alerted). `instructions.json` lists their keys under `GENERAL`. Check each is safe for any of the four situations.
2. **Condition-specific lines** for HEART, STROKE, DIABETIC and ASTHMA. In `src/config/instructions.json` each condition is `{ "reviewed": false, "lines": [] }`: the lines are translation keys and the lists are EMPTY today. While `reviewed` is `false` the screen shows only: "Guidance for this condition will appear here after medical review."
3. **The symptom checklist wording**: `src/config/symptoms.js` and the keys `symptom.*` and `category.*` in `en.json`. Are they clear and not misleading?
4. **The "usual range" wording** on Home (`twin.*`): it must stay a comparison with the person's own usual values, never a verdict.
5. **The passport page** (`view.*`): the patient enters the data, so the page states "Prepared by the patient. Not verified by a doctor."

## Sign-off steps (per condition)

1. The doctor writes or approves the lines for one condition. A developer adds them as new keys (for example `instructions.heart1`) in `en.json`, and puts those keys in that condition's `lines` array in `instructions.json`.
2. Hindi and Gujarati versions of the same keys are written or checked by a fluent speaker AND the doctor (see `docs/TRANSLATION_REVIEW.md`; add the new strings to it).
3. Note the reviewer in the commit message and in `docs/RELEASE_CHECKLIST.md`: name, registration number and date. (The app ignores extra fields, so you may also add `"reviewed_by"` and `"reviewed_on"` next to `reviewed` in that condition.)
4. Only then change that condition's `"reviewed": false` to `"reviewed": true`. One condition at a time; run `npm test` after each change.
5. Commit with a message such as `Clinical review: HEART guidance approved by Dr. <name>`.

## Rules that must not change

- The call button is a plain `tel:112` link and never waits for the server.
- The words diagnosis, risk, normal, abnormal never appear in the twin bar, the clock or the passport page.
- No dose, drug or treatment advice. Only simple actions a bystander can do.
- Red is used only for the emergency flow.

**No flag has been flipped by the developers.**
