// Medical sign-off for the SAMPLE checklists. This is the ONLY switch for the label
// "Sample checklist. Pending medical review."
//
// Both values are EMPTY on purpose. While either one is empty, the portal keeps showing
// "Sample checklist. Pending medical review." (checklist badge, report page, downloaded report).
//
// How to fill it in (only after a real doctor has signed docs/DOCTOR_REVIEW_SHEET.md):
//   1. Check the signed sheet. If the doctor changed or removed any line, make those changes first.
//   2. Put the doctor's name in reviewedBy, for example 'Dr A. Sharma, MD'.
//   3. Put the date they signed in reviewedOn, for example '2026-11-20'.
// Do not fill these in for anyone who has not signed. Claude and the other developers must not either.
export const reviewStatus = {
  reviewedBy: '',
  reviewedOn: '',
};
