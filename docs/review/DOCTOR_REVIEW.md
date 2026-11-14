# Doctor review pack

**Status: nothing has been reviewed or approved. No `reviewed` flag was changed.** This pack is the material for one sitting with a doctor (about 45 minutes). The software is a simulation and never diagnoses; the doctor is asked only whether the wording and the checklist are safe to show.

## What to bring back

For each item: **Approve**, **Change to ...**, or **Remove**, plus any comment. Then a developer applies the changes and flips `reviewed` one condition at a time (steps in `docs/CLINICAL_REVIEW.md`). Record name, registration number and date.

## 1. The three general lines (shown in every emergency)

- `instructions.general1`: "Call 112 / 108 now."
- `instructions.general2`: "If you can, unlock the door and tell someone nearby."
- `instructions.general3`: "Stay where you are. Your hospital has been alerted."

Question: is "Your hospital has been alerted" the right claim? (The app says "notification sent" elsewhere; nothing is real in this prototype.)

## 2. Condition-specific lines

HEART, STROKE, DIABETIC and ASTHMA each have **no lines yet** (`reviewed: false`). Please write the few simple actions a bystander may take for each, or say none should be shown. No drugs, doses or treatment.

## 3. The alert checklist (rules)

28 rules, all "pending doctor review", in `doctor-review.csv` (one row per rule: id, type, severity, conditions in plain words, the rule's own sentence, empty columns Approve / Change to / Remove / Comment). The app never shows the rule sentence to the patient; it says only "This combination is on our alert checklist."

| Severity | Count |
|---|---|
| EMERGENCY | 10 |
| URGENT | 12 |
| WATCH | 6 |

Ask: is any rule too eager (false alarms) or too slow (missed alert)? Are the severities right? Is anything missing for these four conditions?

## 4. "Why this alert" wording (neutral by design)

The patient and the hospital see what was reported and which checklist rules matched, never a score or a diagnosis. Current English text:

- `why.title`: Why this alert
- `why.loading`: Loading...
- `why.unavailable`: Reasons are not available right now
- `why.told`: What you told us
- `why.noneReported`: You did not report any symptoms.
- `why.noneCheckIn`: You did not report symptoms. This alert started from the safety check-in.
- `why.readings`: What your readings showed
- `why.noReadings`: No readings were shared. Live vitals sharing is off, or no reading was available.
- `why.readingsAt`: Reading taken at {{time}}
- `why.checklist`: Which checklist matched
- `why.neutral`: This combination is on our alert checklist.
- `why.noMatch`: Nothing matched our checklist. This does not say anything about your health.
- `why.draft`: This checklist is a draft waiting for a doctor to review. It does not say what is wrong with you. If you feel unwell, call 112 / 108.

Ask: does any sentence sound like a diagnosis, a promise or a reassurance? The words diagnosis, risk, normal, abnormal must not appear.

## 5. Symptom wording

Checklist (patient side) is in `docs/TRANSLATION_REVIEW.md` (keys `symptom.*`). The hospital desk sees these readable labels (`mock-server/adapters.js`):

| Symptom ID | Label the hospital desk sees |
|---|---|
| `CHEST_PAIN` | Chest pain |
| `ARM_JAW_PAIN` | Pain spreading to arm or jaw |
| `FACE_DROOP` | Face drooping |
| `SUDDEN_CONFUSION` | Sudden confusion |
| `DIA_CONFUSION` | Confusion |
| `LOW_GLUCOSE_READING` | Low glucose reading |
| `WHEEZING` | Wheezing |

Ask: are the labels accurate, clear and not misleading? Is "Pain spreading to arm or jaw" fair for what the patient ticks?

## 6. "Usual range" wording on Home

Keys `twin.*`: a comparison with the person's own usual values, never a verdict. Ask: does "Changed from your usual" worry people more than it should, or too little?

## 7. Responder passport page

Says "Prepared by the patient. Not verified by a doctor." Ask: is that enough for a stranger reading it in an emergency?

## Sign-off

| Item | Reviewer name | Registration no. | Date | Result |
|---|---|---|---|---|
| General lines | | | | |
| HEART lines | | | | |
| STROKE lines | | | | |
| DIABETIC lines | | | | |
| ASTHMA lines | | | | |
| Rules table | | | | |
| Why this alert wording | | | | |
| Symptom wording | | | | |
| Usual-range wording | | | | |
| Passport page | | | | |
