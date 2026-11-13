# New and changed rules for a doctor to review

> **DRAFT. Written by an AI assistant as a starting point for a real doctor.** It is based on published public first-aid and
> patient guidance, summarised by the assistant. It is **not medical advice, not a clinical decision, and nothing here has been
> reviewed or approved by a doctor.** Every rule below stays "pending doctor review" (`reviewed: false`) until a named, registered
> doctor signs it off using the steps in `docs/CLINICAL_REVIEW.md`. This prototype supports escalation and never diagnoses.

## Why this sheet exists

Seven symptoms in the patient app have no rule in the rules engine today, so a patient who taps only one of them would get severity **NONE**:
`NAUSEA`, `FAINTING`, `SEVERE_HEADACHE`, `DIA_SHAKING`, `DIA_FAINTING`, `CANNOT_SPEAK_SENTENCES`, `BLUE_LIPS`.
The safety check-in (fall or inactivity check with no reply) also has no rule. The sheet proposes draft rules for each, in the same
format as `docs/review/doctor-review.csv`. Please mark Approve, Change to, or Remove for each row.

## Draft rules

| Rule | Type | Draft severity | Conditions | Why this draft |
|---|---|---|---|---|
| `ASTHMA_BLUE_LIPS` | ASTHMA | **EMERGENCY** | all of: blue_lips | Asthma first-aid guidance (Better Health Victoria, Asthma Canada, St John Ambulance) lists blue or grey lips as a sign to call an ambulance. |
| `ASTHMA_CANNOT_SPEAK_SENTENCES` | ASTHMA | **EMERGENCY** | all of: cannot_speak_sentences | The same guidance lists being unable to speak a full sentence as a severe sign that needs an ambulance. |
| `STROKE_SUDDEN_CONFUSION` | STROKE | **EMERGENCY** | all of: sudden_confusion | The UK Stroke Association lists sudden confusion among stroke signs and says to call 999. Today the app maps it to the diabetic confusion rule (URGENT, DIABETIC), which looks wrong in the stroke list. |
| `STROKE_SEVERE_HEADACHE` | STROKE | **URGENT** | all of: severe_headache | A SUDDEN severe headache is listed as a stroke sign, but most strokes do not cause a headache and the app wording does not say 'sudden'. Draft is URGENT alone; the doctor may raise it to EMERGENCY, or we change the app wording to 'Sudden, severe headache'. |
| `FAINTING` | HEART | **URGENT** | all of: fainting | NHS advice: see a doctor after any faint, and call 999 in the situations in the next row. |
| `FAINTING_WITH_BREATHING_ARM_OR_CONFUSION_SIGNS` | HEART | **EMERGENCY** | all of: fainting; any of: breathlessness, left_arm_pain, confusion | NHS and other sources: fainting with chest pain, an irregular heartbeat, breathlessness, or not recovering fully is a reason to call emergency services. (Chest pain alone is already EMERGENCY.) |
| `DIABETIC_SHAKING` | DIABETIC | **URGENT** | all of: shaking | NHS and Diabetes UK material lists shaking as an early low-sugar sign that people can often treat themselves. Draft is URGENT because the glucose level is not known; the doctor may lower it to WATCH. |
| `DIABETIC_SHAKING_WITH_LOW_GLUCOSE_OR_CONFUSION` | DIABETIC | **EMERGENCY** | all of: shaking; any of: low_glucose, confusion | Confusion is described as a more severe low-sugar sign. This matches the existing rule that low glucose with confusion or sweating is EMERGENCY. |
| `DIABETIC_FAINTING` | DIABETIC | **EMERGENCY** | all of: diabetic_fainting | Low-sugar guidance (NHS) treats unconsciousness as an emergency, and Healthline lists diabetes among the reasons to call emergency services after a faint. |
| `HEART_NAUSEA` | HEART | **WATCH** | all of: nausea | Nausea is non-specific. It is listed as a possible accompanying sign of a heart problem, but not a strong one alone. |
| `HEART_NAUSEA_WITH_SWEATING` | HEART | **URGENT** | all of: nausea, sweating | Nausea plus sweating are listed together with chest symptoms. Draft is URGENT; existing rules already make breathlessness with sweating EMERGENCY. |
| `CHECKIN_NO_REPLY` | UNKNOWN | **EMERGENCY** | all of: checkin_no_reply | Comparable products (for example Apple Watch fall detection) contact emergency services when a person stays still and does not answer after a countdown. Draft is EMERGENCY because the person cannot be reached; false alarms are possible, so the doctor decides. |

## Questions for the doctor

1. Should anything a patient taps after pressing "Get help now" ever be rated below URGENT?
2. A safety check-in with no reply: EMERGENCY (draft), or URGENT?
3. `SEVERE_HEADACHE` alone: URGENT (draft) or EMERGENCY? Should the app say "Sudden, severe headache"?
4. `DIA_SHAKING` alone: URGENT (draft) or WATCH?
5. `NAUSEA` alone: WATCH (draft) acceptable?
6. Should vitals alone ever reach EMERGENCY? Today the maximum from vitals alone is URGENT (see the existing sheet).

## Existing mapping choices that also need a look

- `SUDDEN_CONFUSION` (stroke list) currently maps to the plain `confusion` symptom, which triggers a **diabetic URGENT** rule. The draft adds a separate stroke rule.
- `ARM_JAW_PAIN` currently maps to **left-arm pain** only. Should jaw pain and right-arm pain count the same way?
- `SHORT_BREATH` and `SEVERE_SHORT_BREATH` both map to the single symptom `breathlessness`. Is that acceptable?

## Sources the doctor can check (public pages, not endorsements)

- Asthma emergency first aid, Better Health Channel (Victoria): https://www.betterhealth.vic.gov.au/health/ConditionsAndTreatments/asthma-emergency-first-aid
- Asthma attack signs, Asthma Canada: https://asthma.ca/care
- Asthma attack first aid, St John Ambulance: https://www.sja.org.uk/first-aid-advice/asthma-attack/
- Stroke symptoms, Stroke Association (UK): https://www.stroke.org.uk/stroke/symptoms
- Hypoglycaemia, NHS: https://www.nhs.uk/conditions/type-1-diabetes/managing-blood-glucose-levels/hypoglycaemia-hypos/
- Hypoglycaemia, Better Health Channel (Victoria): https://betterhealth.vic.gov.au/health/conditionsandtreatments/hypoglycaemia
- Fainting, NHS: https://www.nhs.uk/symptoms/fainting
- Fainting, Healthline: https://www.healthline.com/health/fainting
- Fall detection and the no-response countdown, Apple Support: https://support.apple.com/en-vn/HT208944

These pages are written for the UK, Australia, Canada and the US. Indian emergency numbers (112 / 108) and local practice may differ, which is another reason a doctor must review.

## Sign-off (to be filled in by the doctor, not by the developers)

| Reviewer name | Registration number | Date | Rules approved | Rules changed or removed |
|---|---|---|---|---|
| | | | | |
