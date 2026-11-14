// End-to-end tests of the hospital portal in mock mode (everything shown is simulated).
import { test, expect } from '@playwright/test';
import { login, cards, cardById, simulate, takeOverIfAsked } from './helpers.js';

test.describe('login and queue', () => {
  test('a wrong password is refused and the right one opens the queue', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[autocomplete=username]', 'staff@demo');
    await page.fill('input[type=password]', 'wrong');
    await page.click('button:has-text("Log in")');
    await expect(page.locator('[role=alert]')).toBeVisible();
    await page.fill('input[type=password]', 'demo123');
    await page.click('button:has-text("Log in")');
    await expect(cards(page).first()).toBeVisible();
    await expect(page.locator('ul[aria-label="Alert queue"]')).toBeVisible();
  });
});

test.describe('early notice and SOS', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('an early notice is quiet: grey, no NEW badge, no flash, polite announcement', async ({ page }) => {
    const id = await simulate(page, 'mock-early');
    const card = cardById(page, id);
    await expect(card).toHaveAttribute('data-early', 'true');
    await expect(card).toHaveAttribute('data-unread', 'false');
    await expect(card.locator('[data-testid=new-badge]')).toHaveCount(0);
    expect(await card.getAttribute('class')).not.toContain('ht-flash');
    await expect(page.locator('[data-testid=live-polite]')).toContainText('Early notice');
    await expect(page.locator('[data-testid=live-assertive]')).toHaveText('');
    await card.click();
    await expect(page.locator('[data-testid=early-banner]')).toBeVisible();
  });

  test('an early notice that is confirmed becomes a real SOS: NEW, announced, can be acknowledged', async ({ page }) => {
    const id = await simulate(page, 'mock-early');
    const card = cardById(page, id);
    await card.click();
    await page.click('[data-testid=mock-confirm-sos]');
    await expect(card).toHaveAttribute('data-state', 'SOS_SENT');
    await expect(card).toHaveAttribute('data-early', 'false');
    await expect(card.locator('[data-testid=new-badge]')).toHaveText('NEW');
    await expect(page.locator('[data-testid=live-assertive]')).toContainText('New emergency alert');
    await card.click();
    await takeOverIfAsked(page);
    await page.click('[data-action=HOSPITAL_ACKNOWLEDGED]');
    await expect(card).toHaveAttribute('data-state', 'HOSPITAL_ACKNOWLEDGED');
  });
});

test.describe('acknowledge and cancel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('acknowledge adds a step to the timeline', async ({ page }) => {
    const id = await simulate(page, 'mock-new-alert');
    await cardById(page, id).click();
    await takeOverIfAsked(page);
    await page.click('[data-action=HOSPITAL_ACKNOWLEDGED]');
    await expect(cardById(page, id)).toHaveAttribute('data-state', 'HOSPITAL_ACKNOWLEDGED');
    await expect(page.locator('[data-testid=timeline] li[data-reached=true]:not([data-stage=NOTE])')).toHaveCount(2); // a take-over note may add a NOTE row
  });

  test('a cancelled alert shows CANCELLED and cannot be dispatched', async ({ page }) => {
    const id = await simulate(page, 'mock-new-alert');
    await cardById(page, id).click();
    await page.click('[data-testid=mock-cancel]');
    await expect(cardById(page, id)).toHaveAttribute('data-state', 'CANCELLED');
    await expect(cardById(page, id)).toContainText('CANCELLED');
    await expect(page.locator('[data-action=AMBULANCE_DISPATCHED]')).toBeDisabled();
  });
});

test.describe('queue scope', () => {
  test('My hospital hides other hospitals and says how many; All hospitals brings them back', async ({ page }) => {
    await login(page);
    await expect(page.locator('[data-testid=scope-all]')).toHaveAttribute('aria-pressed', 'true'); // mock mode starts on All
    const all = await cards(page).count();
    await page.click('[data-testid=scope-mine]');
    await expect(page.locator('[data-testid=scope-mine]')).toHaveAttribute('aria-pressed', 'true');
    const mine = await cards(page).count();
    expect(mine).toBeLessThanOrEqual(all);
    if (mine < all) {
      await expect(page.locator('[data-testid=hidden-count]')).toContainText(String(all - mine));
      // the hint has a link that goes straight to All hospitals
      await page.click('[data-testid=show-all-link]');
      await expect(page.locator('[data-testid=scope-all]')).toHaveAttribute('aria-pressed', 'true');
      await expect(cards(page)).toHaveCount(all);
      await expect(page.locator('[data-testid=show-all-link]')).toHaveCount(0);
      await page.click('[data-testid=scope-mine]');
    }
    await page.click('[data-testid=scope-all]');
    await expect(cards(page)).toHaveCount(all);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a new alert does not flash, but still shows its border colour and the NEW text', async ({ page }) => {
    await login(page);
    const id = await simulate(page, 'mock-new-alert');
    const card = cardById(page, id);
    await expect(card.locator('[data-testid=new-badge]')).toHaveText('NEW');
    const style = await card.evaluate((e) => ({ animation: getComputedStyle(e).animationName, border: getComputedStyle(e).borderLeftWidth }));
    expect(style.animation).toBe('none');
    expect(style.border).not.toBe('0px');
  });
});

test.describe('language switch', () => {
  test('Hindi and Gujarati change the screen, <html lang> and survive a reload; symptom words stay English', async ({ page }) => {
    await login(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const sw = page.locator('[data-testid=lang-switch]');
    await sw.focus();
    await sw.selectOption('hi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.locator('nav >> text=डैशबोर्ड')).toBeVisible();
    await expect(page.locator('[data-testid=connection]')).toContainText('नकली डेटा');
    await expect(page.locator('header')).toContainText('Simulated'); // the word stays English
    // clinical words are not translated
    const cardText = await cards(page).first().innerText();
    expect(cardText).toMatch(/[A-Za-z]/);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi'); // saved
    await sw.selectOption('gu');
    await expect(page.locator('html')).toHaveAttribute('lang', 'gu');
    await expect(page.locator('nav >> text=ડેશબોર્ડ')).toBeVisible();
    await sw.selectOption('en');
    await expect(page.locator('nav >> text=Dashboard')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('accessibility basics', () => {
  test('every page has a skip link that moves focus to the main area', async ({ page }) => {
    await login(page);
    for (const path of ['/dashboard', '/history', '/analytics']) {
      await page.goto(path);
      await expect(page.locator('nav')).toBeVisible();
      await page.focus('[data-testid=skip-main]');
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('main');
    }
  });

  test('a page the role cannot open says so, with a way back and a log out', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await expect(page.locator('[data-testid=access-denied]')).toBeVisible();
    await expect(page.locator('[data-testid=access-back]')).toBeVisible();
    await page.click('[data-testid=access-logout]');
    await expect(page.locator('input[type=password]')).toBeVisible();
  });
});

test.describe('saved mock history', () => {
  test('the saved count shows, "Clear history" asks first, and then forgets only the saved cases', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      const mk = (n) => ({ emergency_id: `E-SAVED-${n}`, patient_id: 'P-1', type: 'HEART', severity: 'EMERGENCY', state: 'HANDOVER_DONE', created_at: `2026-01-0${n}T10:00:00.000Z`, status_events: [{ state: 'SOS_SENT', timestamp: `2026-01-0${n}T10:00:00.000Z` }, { state: 'HANDOVER_DONE', timestamp: `2026-01-0${n}T10:20:00.000Z` }] });
      localStorage.setItem('ht_mock_history', JSON.stringify([mk(1), mk(2)]));
    });
    await login(page);
    await page.goto('/history');
    await expect(page.locator('[data-testid=history-saved]')).toContainText('2');
    await page.click('[data-testid=history-clear-saved]');
    await page.click('[data-testid=history-clear-no]'); // "no" keeps everything
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ht_mock_history')).length)).toBe(2);
    await page.click('[data-testid=history-clear-saved]');
    await page.click('[data-testid=history-clear-yes]');
    await expect(page.locator('[data-testid=history-clear-saved]')).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem('ht_mock_history'))).toBe(null);
    await expect(page.locator('[data-testid=history-row]').first()).toBeVisible(); // the sample past cases are still there
  });
});

test.describe('presentation mode', () => {
  test('bigger text, mock helper buttons hidden, language fixed, and it survives a reload', async ({ page }) => {
    await login(page);
    await expect(page.locator('[data-testid=mock-new-alert]')).toBeVisible();
    const size = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const normal = await size();
    await page.click('[data-testid=presentation-toggle]');
    await expect(page.locator('[data-testid=presentation-toggle]')).toHaveAttribute('aria-pressed', 'true');
    expect(await size()).toBeGreaterThan(normal);
    await expect(page.locator('[data-testid=mock-new-alert]')).toHaveCount(0);
    await expect(page.locator('[data-testid=mock-early]')).toHaveCount(0);
    await expect(page.locator('[data-testid=reset-demo]')).toHaveCount(0);
    await expect(page.locator('[data-testid=lang-switch]')).toBeDisabled();
    await page.reload();
    await expect(page.locator('[data-testid=presentation-toggle]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid=mock-new-alert]')).toHaveCount(0);
    await page.click('[data-testid=presentation-toggle]'); // off again: everything is back
    await expect(page.locator('[data-testid=mock-new-alert]')).toBeVisible();
    expect(await page.locator('[data-testid=lang-switch]').isDisabled()).toBe(false);
    expect(await size()).toBe(normal);
  });
});
