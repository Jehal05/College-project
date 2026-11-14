# Questions to help the doctor (not a medical review)

**These are notes from an AI assistant, not a doctor's review.** They make no clinical statement and change no wording. They only point to places where a doctor's judgement is most useful, so the review takes about 10 minutes. A doctor's marks on `DOCTOR_REVIEW_SHEET.html` are the only review that counts. Simulated prototype: nothing here is medical advice.

Please answer on the sheet (OK, Change to, Remove). The questions below are optional prompts.

## 1. Capabilities needed per emergency type
- Is "Cath Lab + Emergency" the right requirement for a heart attack, and "Stroke Unit + Emergency" for a stroke?
- Severe asthma requires "ICU + Emergency". Is ICU the right hard requirement, or should it be an optional extra? (A hospital without ICU is never ranked for asthma today.)
- Diabetic emergency and safety check-in require only "Emergency". Is that enough?

## 2. Severity in the sample alerts
- Heart and stroke are shown as EMERGENCY, asthma and diabetic as URGENT. Are those levels right for the sample cases? Should any be higher or lower?
- Should a safety check-in with no symptoms have a default severity?

## 3. Symptom words
- Are the plain words clear to a hospital desk? Is any word missing for these four emergency types, or any ambiguous (for example "Sweating" and "Confusion" appear for more than one type)?
- Should "Blue lips" or "Low glucose reading" use a different standard term?

## 4. Checklists (one question per type)
- Heart attack: are the six items complete and in a sensible order? Is anything missing or unnecessary?
- Stroke: same question. Item 3 asks the desk to note the symptom start time; is that the right item for the desk?
- Diabetic emergency: same question for the five items.
- Severe asthma: same question for the five items.
- Safety check-in: this is for a case with no known cause. Are the four items reasonable for a desk to do while the cause is unknown?
- Across all types: should any item be marked as mandatory, or should the order of items change?

## 5. Wording and responsibility
- Is any line phrased as an instruction that only a clinician should give? The portal is meant to support desk staff only and never diagnoses.
- Is there anything you would not want shown to a hospital desk in a demo?

## After the doctor signs
Follow the steps in `REVIEW_PACK.md` ("After the doctor has signed"). Only Puneet fills in `src/data/reviewStatus.js`, and only after a real signature.
