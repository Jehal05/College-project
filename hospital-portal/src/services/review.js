// Medical review status of the sample checklists. Pure functions (tests: review.test.js).
// Nothing here names a reviewer by itself. The label "Sample checklist. Pending medical review."
// goes away ONLY when src/data/reviewStatus.js has both reviewedBy and reviewedOn filled in.
import { reviewStatus } from '../data/reviewStatus.js';

/** @returns {{ signed: boolean, who: string, date: string }} signed only when both fields hold real text */
export function signOff(status = reviewStatus) {
  const who = String(status?.reviewedBy ?? '').trim();
  const date = String(status?.reviewedOn ?? '').trim();
  return { signed: Boolean(who && date), who, date };
}

export const REVIEW_STATUSES = ['draft', 'reviewed'];

export const isReviewed = (item) => item?.status === 'reviewed' && Boolean(item.reviewed_by) && Boolean(item.reviewed_on);

/**
 * @returns {{ state: 'draft'|'partial'|'reviewed', reviewers: string[], date: string|null }}
 *   draft = no item reviewed, partial = some, reviewed = all items reviewed (names and latest date listed)
 */
export function reviewSummary(items = []) {
  const done = items.filter(isReviewed);
  const state = items.length === 0 || done.length === 0 ? 'draft' : done.length === items.length ? 'reviewed' : 'partial';
  const reviewers = [...new Set(done.map((i) => i.reviewed_by))];
  const date = done.map((i) => i.reviewed_on).sort().at(-1) || null;
  return { state, reviewers, date };
}

/**
 * Label for the checklist. It says "Reviewed by ..." only when signOff() says both name and date are filled in;
 * in every other case, whatever the per-item fields say, it is the sample label. (items is kept for old callers.)
 */
export function reviewBadge(items = [], t, status = reviewStatus) {
  const s = signOff(status);
  const L = (key, english, vars) => {
    const v = t ? t(key, vars) : key;
    return !t || v === key ? english : v;
  };
  if (s.signed) return L('rv.reviewed', `Reviewed by ${s.who} on ${s.date}`, { who: s.who, date: s.date });
  return L('rp.sampleChecklist', 'Sample checklist. Pending medical review.');
}
