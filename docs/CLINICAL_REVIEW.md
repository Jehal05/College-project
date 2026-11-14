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

## Phase 6: items a doctor must review (nothing has been flipped)

### 1. The rules table behind "Why this alert"

`mock-server/data/rules.json` is a copy of Daksh's `rules.yaml` v0.1 (source of truth stays in his branch). Every rule is **pending doctor review** (`reviewed: false`). The app never shows a rule's own sentence while it is pending; it shows the neutral line instead. A doctor should confirm, change or remove each rule, its severity and its thresholds. Only after that may a rule's `reviewed` flag be set to true (not done here).

| Rule | Type | Severity | Conditions | Rule's own sentence (hidden in the app) | Reviewed |
|---|---|---|---|---|---|
| `HEART_CHEST_PAIN` | HEART | EMERGENCY | all of: chest_pain | Chest pain is a red-flag symptom | no |
| `HEART_ARM_PAIN_WITH_SWEATING_OR_BREATHLESSNESS` | HEART | EMERGENCY | all of: left_arm_pain; any of: sweating, breathlessness | Left-arm pain together with sweating or breathlessness | no |
| `HEART_BREATHLESSNESS_WITH_SWEATING` | HEART | EMERGENCY | all of: breathlessness, sweating | Breathlessness together with sweating | no |
| `HEART_LEFT_ARM_PAIN` | HEART | URGENT | all of: left_arm_pain | Left-arm pain reported | no |
| `HEART_SWEATING` | HEART | WATCH | all of: sweating | Unexplained sweating reported | no |
| `HEART_RATE_VERY_HIGH` | HEART | URGENT | heart_rate gt 120 | Heart rate is well above the usual range | no |
| `HEART_RATE_VERY_LOW` | HEART | URGENT | heart_rate lt 45 | Heart rate is well below the usual range | no |
| `HEART_RATE_RAISED` | HEART | WATCH | heart_rate gt 100, lte 120 | Heart rate is somewhat raised | no |
| `HEART_BP_VERY_HIGH` | HEART | URGENT | bp_sys gte 180 | Systolic blood pressure is very high | no |
| `HEART_BP_VERY_LOW` | HEART | URGENT | bp_sys lt 90 | Systolic blood pressure is very low | no |
| `HEART_BP_RAISED` | HEART | WATCH | bp_sys gte 160, lt 180 | Systolic blood pressure is raised | no |
| `STROKE_FACE_DROOPING` | STROKE | EMERGENCY | all of: face_drooping | Face drooping is a stroke warning sign | no |
| `STROKE_ARM_WEAKNESS` | STROKE | EMERGENCY | all of: arm_weakness | Arm weakness is a stroke warning sign | no |
| `STROKE_SLURRED_SPEECH` | STROKE | EMERGENCY | all of: slurred_speech | Slurred speech is a stroke warning sign | no |
| `DIABETIC_LOW_GLUCOSE_READING_WITH_CONFUSION_OR_SWEATING` | DIABETIC | EMERGENCY | any of: confusion, sweating; glucose lt 70 | Low glucose reading with confusion or sweating | no |
| `DIABETIC_LOW_GLUCOSE_REPORTED_WITH_CONFUSION_OR_SWEATING` | DIABETIC | EMERGENCY | all of: low_glucose; any of: confusion, sweating | Low glucose reported with confusion or sweating | no |
| `DIABETIC_LOW_GLUCOSE_READING` | DIABETIC | URGENT | glucose lt 70 | Low glucose reading | no |
| `DIABETIC_LOW_GLUCOSE_REPORTED` | DIABETIC | URGENT | all of: low_glucose | Low glucose reported by the patient | no |
| `DIABETIC_CONFUSION` | DIABETIC | URGENT | all of: confusion | Confusion reported; a glucose check is advised | no |
| `DIABETIC_GLUCOSE_HIGH` | DIABETIC | WATCH | glucose gt 250 | Glucose reading is high | no |
| `ASTHMA_WHEEZE_WITH_LOW_SPO2` | ASTHMA | EMERGENCY | all of: wheeze; spo2 lt 92 | Wheeze together with low oxygen saturation | no |
| `ASTHMA_WHEEZE_WITH_BREATHLESSNESS` | ASTHMA | EMERGENCY | all of: wheeze, breathlessness | Wheeze together with breathlessness | no |
| `ASTHMA_WHEEZE` | ASTHMA | URGENT | all of: wheeze | Wheeze reported | no |
| `ASTHMA_BREATHLESSNESS` | ASTHMA | URGENT | all of: breathlessness | Breathlessness reported | no |
| `HEART_BREATHLESSNESS` | HEART | URGENT | all of: breathlessness | Breathlessness reported | no |
| `ASTHMA_SPO2_LOW` | ASTHMA | URGENT | spo2 lt 92 | Oxygen saturation is low | no |
| `ASTHMA_SPO2_BORDERLINE` | ASTHMA | WATCH | spo2 gte 92, lt 95 | Oxygen saturation is slightly low | no |
| `ASTHMA_BREATHING_FAST` | ASTHMA | WATCH | resp_rate gt 24 | Breathing rate is raised | no |

### 2. The neutral wording the patient sees (English; Hindi and Gujarati in `docs/TRANSLATION_REVIEW.md`)

- Matched checklist line: "This combination is on our alert checklist." (`why.neutral`)
- Nothing matched: "Nothing matched our checklist. This does not say anything about your health." (`why.noMatch`)
- Footer: "This checklist is a draft waiting for a doctor to review. It does not say what is wrong with you. If you feel unwell, call 112 / 108." (`why.draft`)
- Readings are shown with value, unit and time only. Severity is never shown as a score.
- Trend labels: "Within your usual range" / "Changed from your usual" (`twin.within`, `twin.different`). "Usual range" comes from the patient baseline; a doctor should confirm that wording is acceptable.
- Reminders: the app gives no dose or missed-dose advice, only "Ask your doctor or pharmacist what to do." (`reminders.missed`).
- Record of an alert: "This is a record of what the app did. It does not describe your health." (`summary.record`).

### 3. Symptom mapping used by the rules engine

The app sends UPPER_SNAKE_CASE IDs (for example `CHEST_PAIN`); the rules use lower-case names (`chest_pain`). The only translation is in `mock-server/adapters.js` (and `patient-app/src/utils/adapters.js`). It is a first guess. App symptoms with no counterpart in the rules table are ignored by the engine: `NAUSEA`, `FAINTING`, `SEVERE_HEADACHE`, `DIA_SHAKING`, `DIA_FAINTING`, `CANNOT_SPEAK_SENTENCES`, `BLUE_LIPS`. A doctor (with Daksh) should decide whether rules are missing for them, and whether the other mappings (for example `ARM_JAW_PAIN` to `left_arm_pain`, `LIMB_WEAKNESS` to `arm_weakness`, `SHORT_BREATH` to `breathlessness`) are right.
