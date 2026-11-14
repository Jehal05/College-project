// More end-to-end tests (mock mode, everything simulated): escalation, dispatch, Hindi/Gujarati cards, availability form.
import { test, expect } from '@playwright/test';
import { login, cardById, simulate } from './helpers.js';

test.describe('escalation', () => {
  test('escalating moves the alert on: orange banner, timeline entry, and it can still be acknowledged', async ({ page }) => {
    await login(page);
    const id = await simulate(page, 'mock-new-alert');
    await cardById(page, id).click();
    await page.click('[data-testid=mock-escalate]');
    await expect(cardById(page, id)).toHaveAttribute('data-state', 'ESCALATED');
    await expect(page.locator('[data-testid=escalation-banner]')).toContainText('Escalated');
    await expect(page.locator('[data-testid=timeline]')).toContainText('Escalated to next hospital');
    await page.click('[data-action=HOSPITAL_ACKNOWLEDGED]');
    await expect(cardById(page, id)).toHaveAttribute('data-state', 'HOSPITAL_ACKNOWLEDGED');
    await expect(page.locator('[data-testid=escalation-banner]')).toHaveCount(0);
  });
});

test.describe('dispatch', () => {
  test('on a small window the Confirm button can still be reached and clicked (1280 x 495)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 495 });
    await login(page);
    const id = await simulate(page, 'mock-new-alert');
    await cardById(page, id).click();
    await page.click('[data-action=HOSPITAL_ACKNOWLEDGED]');
    await page.click('[data-action=AMBULANCE_DISPATCHED]');
    const confirm = page.locator('[data-testid=confirm-dispatch]');
    await expect(confirm).toBeVisible();
    // The whole dialog fits inside the window, so Confirm is on screen without scrolling the page.
    const box = await confirm.boundingBox();
    expect(box.y + box.height <= 495).toBe(true);
    expect(box.y >= 0).toBe(true);
    await confirm.click();
    await expect(page.locator('[data-testid=dispatch-dialog]')).toHaveCount(0);
  });

  test('dispatch needs acknowledge first, shows a confirm dialog, then moves the state on', async ({ page }) => {
    await login(page);
    const id = await simulate(page, 'mock-new-alert');
    await cardById(page, id).click();
    await expect(page.locator('[data-action=AMBULANCE_DISPATCHED]')).toBeDisabled();
    await page.click('[data-action=HOSPITAL_ACKNOWLEDGED]');
    await expect(page.locator('[data-action=AMBULANCE_DISPATCHED]')).not.toBeDisabled();
    await page.click('[data-action=AMBULANCE_DISPATCHED]');
    await expect(page.locator('[data-testid=confirm-dispatch]')).toBeVisible();
    await page.locator('[data-testid=confirm-dispatch]').click();
    await expect(cardById(page, id)).toHaveAttribute('data-state', 'AMBULANCE_DISPATCHED');
  });
});

test.describe('Hindi and Gujarati on the dashboard', () => {
  for (const [lang, word] of [['hi', 'डैशबोर्ड'], ['gu', 'ડેશબોર્ડ']]) {
    test(`${lang}: card, detail and dispatch dialog are translated, "Simulated" stays English`, async ({ page }) => {
      await login(page);
      await page.locator('[data-testid=lang-switch]').selectOption(lang);
      await expect(page.locator(`nav >> text=${word}`)).toBeVisible();
      const id = await simulate(page, 'mock-new-alert');
      await cardById(page, id).click();
      const text = await page.locator('[data-testid=detail-panel]').innerText();
      expect(text).toMatch(lang === 'hi' ? /[ऀ-ॿ]/ : /[઀-૿]/);
      await page.click('[data-action=HOSPITAL_ACKNOWLEDGED]');
      await page.click('[data-action=AMBULANCE_DISPATCHED]');
      await expect(page.locator('body')).toContainText('simulated');
      await expect(page.locator('[data-testid=confirm-dispatch]')).toBeVisible();
    });
  }
});

test.describe('hospital availability', () => {
  test('saving the availability form shows "Saved at" and rejects bad numbers', async ({ page }) => {
    await login(page);
    await page.click('[data-testid=toggle-availability]');
    await expect(page.locator('[data-testid=availability-form]')).toBeVisible();
    await page.fill('input[name=beds_free]', '-1');
    await expect(page.locator('[data-testid=availability-form] button')).toBeDisabled();
    await page.fill('input[name=beds_free]', '4');
    await page.click('[data-testid=availability-form] button');
    await expect(page.locator('[data-testid=availability-status]')).toContainText('Saved at');
  });
});
