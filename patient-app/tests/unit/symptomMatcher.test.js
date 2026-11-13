import { describe, expect, it } from 'vitest';
import { matchSymptoms } from '../../src/utils/symptomMatcher';

describe('matchSymptoms (voice only suggests)', () => {
  it('finds a category and symptom IDs in English', () => {
    expect(matchSymptoms('I have chest pain and I am sweating', 'en')).toEqual({ category: 'HEART', ids: expect.arrayContaining(['CHEST_PAIN', 'SWEATING']) });
  });
  it('returns nothing for unrelated words', () => {
    const r = matchSymptoms('hello nothing relevant', 'en'); expect(r === null || (r.ids || []).length === 0).toBe(true);
  });
  it('understands Hindi and Gujarati', () => {
    expect(matchSymptoms('मुझे सीने में दर्द है', 'hi').ids).toContain('CHEST_PAIN');
    expect(matchSymptoms('મને છાતીમાં દુખાવો છે', 'gu').ids).toContain('CHEST_PAIN');
  });
  it('picks the category with most matches', () => {
    expect(matchSymptoms('my sugar is low and I am shaking', 'en').category).toBe('DIABETIC');
  });
  it('breaks a tie in favour of the category already chosen', () => {
    expect(matchSymptoms('sweating', 'en', 'DIABETIC').category).toBe('DIABETIC');
  });
});
