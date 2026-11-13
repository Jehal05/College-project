import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REVIEW_STATUSES, isReviewed, reviewSummary, reviewBadge } from './review.js';
import { buildReviewSheet } from './reviewSheet.js';

const load = (n) => JSON.parse(readFileSync(new URL(`../data/${n}`, import.meta.url), 'utf8'));
const checklists = load('checklists.json');
const lists = Object.entries(checklists).filter(([, v]) => Array.isArray(v));

test('every checklist item has status, reviewed_by and reviewed_on', () => {
  assert.ok(lists.length >= 4);
  for (const [type, items] of lists) {
    for (const i of items) {
      assert.ok(REVIEW_STATUSES.includes(i.status), `${type} ${i.id} status`);
      assert.ok('reviewed_by' in i && 'reviewed_on' in i, `${type} ${i.id} has the review fields`);
    }
  }
});

test('nobody is invented as a reviewer: a reviewed item names a person and a date, a draft names nobody', () => {
  for (const [type, items] of lists) {
    for (const i of items) {
      if (i.status === 'reviewed') {
        assert.ok(i.reviewed_by && Number.isFinite(Date.parse(i.reviewed_on)), `${type} ${i.id}: reviewed needs a name and a date`);
      } else {
        assert.equal(i.reviewed_by, null, `${type} ${i.id}: a draft has no reviewer`);
        assert.equal(i.reviewed_on, null, `${type} ${i.id}: a draft has no review date`);
      }
    }
  }
});

test('review summary and badge: draft, partial, reviewed', () => {
  const draft = { id: 'a', text: 'x', status: 'draft', reviewed_by: null, reviewed_on: null };
  const done = { id: 'b', text: 'y', status: 'reviewed', reviewed_by: 'Dr Example', reviewed_on: '2026-11-20' };
  assert.equal(isReviewed(draft), false);
  assert.equal(isReviewed({ ...done, reviewed_by: '' }), false);
  assert.equal(reviewSummary([]).state, 'draft');
  assert.equal(reviewSummary([draft, draft]).state, 'draft');
  assert.equal(reviewSummary([draft, done]).state, 'partial');
  assert.deepEqual(reviewSummary([done, done]), { state: 'reviewed', reviewers: ['Dr Example'], date: '2026-11-20' });
  assert.equal(reviewBadge([draft]), 'Sample checklist. Pending medical review.');
  assert.match(reviewBadge([draft, done]), /^Partly reviewed \(1 of 2 items\)/);
  assert.equal(reviewBadge([done]), 'Reviewed by Dr Example on 2026-11-20');
});

test('the current data is all draft (no review has happened)', () => {
  for (const [, items] of lists) assert.equal(reviewSummary(items).state, 'draft');
});

test('docs/DOCTOR_REVIEW_SHEET.md is up to date with the data (run npm run review-sheet)', () => {
  const expected = buildReviewSheet({ checklists, alerts: load('mock-alerts.json'), history: load('sample-history.json') });
  // Git on Windows may check the file out with CRLF line endings; the content is what matters.
  const actual = readFileSync(new URL('../../docs/DOCTOR_REVIEW_SHEET.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(actual, expected.replace(/\r\n/g, '\n'));
});
