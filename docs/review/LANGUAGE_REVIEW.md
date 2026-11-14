# Language review pack: Hindi and Gujarati

**Status: nothing has been reviewed by a native speaker.** The Hindi and Gujarati text was written by an AI assistant. This pack is the sheet to hand to one fluent reader per language.

## Brief for the reviewer

- File: `language-review-hi-gu.csv` (open in Excel or Google Sheets). **191 high-priority strings come first** (shown in an emergency, on the responder page, or about consent, offline and voice), then the other 320.
- Columns: key, English, Hindi, Gujarati. Fill the last column with **OK**, a **Better wording**, or a **Note**. Review Hindi and Gujarati in their own columns.
- **Keep neutral words neutral.** Do not make anything sound more alarming, more reassuring or more medical than the English. Nothing may read as a diagnosis or a promise.
- "Not sent yet" must never read as "sent". "Notification sent" is not "help is coming".
- Tone: calm, short, polite, plain words a person in a hurry understands. Use the glossary in `docs/TRANSLATION_REVIEW.md`; the same idea gets the same word everywhere.
- Keep `{{placeholders}}` exactly as they are. Keys ending `_one` / `_other` are singular and plural.
- Do not translate: SOS, 112 / 108, QR, SpO2, bpm, names of people.
- Words that must stay short: buttons and labels are shown on a 360 px wide phone; very long words may be cut or wrap badly. Say so in the note column if a word looks too long.

## After the review

A developer edits `patient-app/src/i18n/hi.json` and `gu.json` only, runs `npm run audit` (overflow check), and ticks the rows in `docs/TRANSLATION_REVIEW.md`. Record the reviewer's name and date there.

## Glossary

See `docs/TRANSLATION_REVIEW.md` (Emergency, Ambulance, Hospital, Symptoms, Cancel, Consent, Emergency contacts, Health passport).
