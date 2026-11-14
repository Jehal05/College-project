// Medical review status of the sample checklists. Pure functions (tests: review.test.js).
// Nothing here names a reviewer by itself: the names and dates come only from src/data/checklists.json,
// where a real doctor or medical teacher is recorded after reading docs/DOCTOR_REVIEW_SHEET.md.

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

/** Short badge text for the checklist. Draft keeps the original wording. */
export function reviewBadge(items = [], t) {
  const s = reviewSummary(items);
  const L = (key, english, vars) => {
    const v = t ? t(key, vars) : key;
    return !t || v === key ? english : v;
  };
  if (s.state === 'reviewed') return L('rv.reviewed', `Reviewed by ${s.reviewers.join(', ')} on ${s.date}`, { who: s.reviewers.join(', '), date: s.date });
  if (s.state === 'partial') return L('rv.partial', `Partly reviewed (${items.filter(isReviewed).length} of ${items.length} items). Sample checklist.`, { n: items.filter(isReviewed).length, m: items.length });
  return L('rp.sampleChecklist', 'Sample checklist. Pending medical review.');
}
