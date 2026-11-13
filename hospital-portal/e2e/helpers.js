// Shared steps for the end-to-end tests. Mock mode login: staff@demo / demo123.
import { expect } from '@playwright/test';

export async function login(page, { email = 'staff@demo', password = 'demo123' } = {}) {
  await page.goto('/');
  await page.fill('input[autocomplete=username]', email);
  await page.fill('input[type=password]', password);
  await page.click('button:has-text("Log in")');
  await expect(page.locator('nav')).toBeVisible();
  await expect(page.locator('[data-testid=alert-card]').first()).toBeVisible();
}

export const cards = (page) => page.locator('[data-testid=alert-card]');
export const cardById = (page, id) => page.locator(`[data-testid=alert-card][data-id="${id}"]`);

/** Click a "Simulate ..." button and return the id of the card that appeared. */
export async function simulate(page, testid) {
  const before = await cards(page).evaluateAll((els) => els.map((e) => e.dataset.id));
  await page.click(`[data-testid=${testid}]`);
  await expect.poll(async () => (await cards(page).evaluateAll((els) => els.map((e) => e.dataset.id))).length).toBeGreaterThan(before.length);
  const after = await cards(page).evaluateAll((els) => els.map((e) => e.dataset.id));
  return after.find((id) => !before.includes(id));
}
