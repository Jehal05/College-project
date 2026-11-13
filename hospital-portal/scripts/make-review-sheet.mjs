// npm run review-sheet  ->  writes docs/DOCTOR_REVIEW_SHEET.md
import { readFileSync, writeFileSync } from 'node:fs';
import { buildReviewSheet } from '../src/services/reviewSheet.js';

const load = (n) => JSON.parse(readFileSync(new URL(`../src/data/${n}`, import.meta.url), 'utf8'));
const md = buildReviewSheet({ checklists: load('checklists.json'), alerts: load('mock-alerts.json'), history: load('sample-history.json') });
writeFileSync(new URL('../docs/DOCTOR_REVIEW_SHEET.md', import.meta.url), md);
console.log('Wrote docs/DOCTOR_REVIEW_SHEET.md');
