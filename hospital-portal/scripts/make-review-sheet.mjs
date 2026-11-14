// npm run review-sheet  ->  writes docs/DOCTOR_REVIEW_SHEET.md and .html
import { readFileSync, writeFileSync } from 'node:fs';
import { buildReviewSheet, buildReviewSheetHtml } from '../src/services/reviewSheet.js';

const load = (n) => JSON.parse(readFileSync(new URL(`../src/data/${n}`, import.meta.url), 'utf8'));
const data = { checklists: load('checklists.json'), alerts: load('mock-alerts.json'), history: load('sample-history.json') };
writeFileSync(new URL('../docs/DOCTOR_REVIEW_SHEET.md', import.meta.url), buildReviewSheet(data));
writeFileSync(new URL('../docs/DOCTOR_REVIEW_SHEET.html', import.meta.url), buildReviewSheetHtml(data));
console.log('Wrote docs/DOCTOR_REVIEW_SHEET.md and docs/DOCTOR_REVIEW_SHEET.html');
