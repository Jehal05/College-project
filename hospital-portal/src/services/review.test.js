import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REVIEW_STATUSES, isReviewed, reviewSummary, reviewBadge, signOff } from './review.js';
import { buildReviewSheet, buildReviewSheetHtml } from './reviewSheet.js';
import { reviewStatus } from '../data/reviewStatus.js';
import { buildReport, reportToText } from './report.js';

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

const PENDING = 'Sample checklist. Pending medical review.';

test('the shipped config is empty, so the pending label shows (nobody is signed off)', () => {
  assert.deepEqual(reviewStatus, { reviewedBy: '', reviewedOn: '' });
  assert.equal(signOff().signed, false);
  assert.equal(reviewBadge([]), PENDING);
});

test('label case 1: unless BOTH reviewedBy and reviewedOn are filled, the pending label shows', () => {
  for (const status of [
    { reviewedBy: '', reviewedOn: '' },
    { reviewedBy: 'Dr Example', reviewedOn: '' },
    { reviewedBy: '', reviewedOn: '2026-11-20' },
    { reviewedBy: '   ', reviewedOn: '2026-11-20' },
    { reviewedBy: 'Dr Example', reviewedOn: '  ' },
    { reviewedBy: null, reviewedOn: undefined },
    {},
  ]) {
    assert.equal(signOff(status).signed, false, JSON.stringify(status));
    assert.equal(reviewBadge([], undefined, status), PENDING, JSON.stringify(status));
  }
});

test('label case 2: with both filled the label names the reviewer and date, and nothing else claims approval', () => {
  const status = { reviewedBy: ' Dr Example ', reviewedOn: '2026-11-20' };
  assert.deepEqual(signOff(status), { signed: true, who: 'Dr Example', date: '2026-11-20' });
  assert.equal(reviewBadge([], undefined, status), 'Reviewed by Dr Example on 2026-11-20');
});

test('per-item fields can never switch the label off; only reviewStatus.js can', () => {
  const done = { id: 'b', text: 'y', status: 'reviewed', reviewed_by: 'Dr Example', reviewed_on: '2026-11-20' };
  assert.equal(isReviewed(done), true);
  assert.equal(reviewBadge([done, done]), PENDING);
});

test('report text keeps the pending wording until signed off', () => {
  const ctx = { hospitals: load('hospitals.json'), rankingConfig: load('ranking-config.json'), checklists, ambulances: load('ambulances.json') };
  const hist = load('sample-history.json');
  const text = reportToText(buildReport(hist[0], [], ctx));
  assert.match(text, /CHECKLIST: \d+ of \d+ done \(sample checklist, pending medical review\)/);
  assert.match(text, /Sample content, pending medical review\. Not a medical record\./);
});

test('review summary: draft, partial, reviewed (per-item data helpers)', () => {
  const draft = { id: 'a', text: 'x', status: 'draft', reviewed_by: null, reviewed_on: null };
  const done = { id: 'b', text: 'y', status: 'reviewed', reviewed_by: 'Dr Example', reviewed_on: '2026-11-20' };
  assert.equal(isReviewed(draft), false);
  assert.equal(isReviewed({ ...done, reviewed_by: '' }), false);
  assert.equal(reviewSummary([]).state, 'draft');
  assert.equal(reviewSummary([draft, draft]).state, 'draft');
  assert.equal(reviewSummary([draft, done]).state, 'partial');
  assert.deepEqual(reviewSummary([done, done]), { state: 'reviewed', reviewers: ['Dr Example'], date: '2026-11-20' });
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

test('the printable sheet lists every checklist item per emergency type with OK / change to / remove and name, date, signature', () => {
  const data = { checklists, alerts: load('mock-alerts.json'), history: load('sample-history.json') };
  const md = buildReviewSheet(data);
  const html = buildReviewSheetHtml(data);
  for (const [, items] of lists) {
    for (const i of items) {
      assert.ok(md.includes(i.text), `md has ${i.id}`);
      assert.ok(html.includes(i.text.replace(/&/g, '&amp;')), `html has ${i.id}`);
    }
  }
  assert.ok(lists.reduce((n, [, v]) => n + v.length, 0) >= 20);
  for (const doc of [md, html]) {
    assert.match(doc, /OK/); assert.match(doc, /Remove/); assert.match(doc, /Change to:/);
    assert.match(doc, /Reviewer name/); assert.match(doc, /Date/); assert.match(doc, /Signature/);
    assert.match(doc, /Pending medical review/);
    assert.doesNotMatch(doc, /\bapproved by\b|\bmedically approved\b/i);
  }
  assert.match(html, /@media print/);
});

test('docs/DOCTOR_REVIEW_SHEET.html is up to date with the data (run npm run review-sheet)', () => {
  const expected = buildReviewSheetHtml({ checklists, alerts: load('mock-alerts.json'), history: load('sample-history.json') });
  const actual = readFileSync(new URL('../../docs/DOCTOR_REVIEW_SHEET.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(actual, expected.replace(/\r\n/g, '\n'));
});
