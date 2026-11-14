# Review pack (Simulated prototype)

Three messages, ready to copy. **Nobody has reviewed anything yet.** Do not tell the jury a review happened until a reviewer has replied and their name and date are written in the files.

Send the file named in each message (from the repo, under `hospital-portal/docs/`).

## 1. Native Hindi speaker

Hi! I am building a college project: a hospital emergency screen. It is a **simulated** prototype (no real patients). I made a Hindi version of the screen with AI help, and I need a native speaker to check it.

File: `TRANSLATION_REVIEW.md`. Please look at the tables and the Hindi column.
1. Is each Hindi line correct and natural?
2. Is anything confusing or too formal?

Please reply for each row: **OK**, or the better wording. Add your name and the date. The word "Simulated" stays in English on purpose. Thank you!

## 2. Native Gujarati speaker

Hi! I am building a college project: a hospital emergency screen. It is a **simulated** prototype (no real patients). I made a Gujarati version of the screen with AI help, and I need a native speaker to check it.

File: `TRANSLATION_REVIEW.md`. Please look at the tables and the Gujarati column.
1. Is each Gujarati line correct and natural?
2. Is anything confusing or too formal?

Please reply for each row: **OK**, or the better wording. Add your name and the date. The word "Simulated" stays in English on purpose. Thank you!

## 3. Doctor

Hello Doctor. I am building a college project: a hospital emergency screen. It is a **simulated** prototype. No real patient or hospital is involved, and nothing in it is medical advice.

I would be grateful if you could look at one file: `DOCTOR_REVIEW_SHEET.html` (open it in a browser and print it; the same content is in `DOCTOR_REVIEW_SHEET.md`).
1. Which hospital capability each emergency type needs.
2. The severity in the sample alerts.
3. The sample symptoms and checklists.

For each line, please tick **OK**, write the change under **Change to**, or tick **Remove**. At the end please add your name, the date and your signature. Thank you!

Optional: `DOCTOR_QUESTIONS.md` has a short list of prompts you can hand over with the sheet. It is notes from an AI, not a review.

## After the doctor has signed

1. Read the signed sheet. If the doctor changed or removed a line, make that change in the data first (the clinical wording is the doctor's, not ours), then run `npm run review-sheet`.
2. Only then open `src/data/reviewStatus.js` and fill in `reviewedBy` (the doctor's name) and `reviewedOn` (the date they signed, e.g. `2026-11-20`). The label "Sample checklist. Pending medical review." goes away only when both are filled. Leave them empty if nobody has signed.
