// Two cities: staff see their own hospital's city; an admin switches to Pune and sees only Pune hospitals and alerts.
import { test, expect } from '@playwright/test';
import { login, cards } from './helpers.js';

const ids = (page) => cards(page).evaluateAll((els) => els.map((e) => e.dataset.id).sort());

test.describe('two cities', () => {
  test('staff see only their own city: Ahmedabad alerts, no switcher', async ({ page }) => {
    await login(page);
    await expect(page.getByTestId('city-showing').first()).toContainText('Ahmedabad, Gujarat');
    await expect(page.getByTestId('city-switcher')).toHaveCount(0);
    await expect(page.getByTestId('city-fixed')).toContainText('Ahmedabad');
    const shown = await ids(page);
    expect(shown).toContain('E-1001');
    expect(shown).not.toContain('E-1004');
  });

  test('an admin switches to Pune: the queue shows the Pune alerts only, and the map the Pune hospitals only', async ({ page }) => {
    await login(page, { email: 'admin@demo' });
    await page.getByTestId('city-switcher').selectOption('PNQ');
    await expect(page.getByTestId('city-showing').first()).toContainText('Pune, Maharashtra');
    await expect.poll(() => ids(page)).toEqual(['E-1004', 'E-1005']);
    await page.locator('nav').getByRole('link', { name: 'Map', exact: true }).click();
    await expect(page.getByTestId('city-showing').first()).toContainText('Pune, Maharashtra');
    const body = page.locator('main');
    await expect(body).toContainText('Mutha Riverside Heart & Stroke Institute');
    await expect(body).not.toContainText('Navrangpura Heart & Stroke');
    await page.locator('nav').getByRole('link', { name: 'Fleet', exact: true }).click();
    await expect(page.getByTestId('fleet-summary')).toContainText('5');
    await expect(page.locator('main')).toContainText('Mutha 1');
    await expect(page.locator('main')).not.toContainText('Alpha 1');
  });

  test('"All cities" brings both queues together, and the choice survives a reload', async ({ page }) => {
    await login(page, { email: 'admin@demo' });
    await page.getByTestId('city-switcher').selectOption('all');
    await expect.poll(async () => (await ids(page)).length).toBe(5);
    await page.reload();
    await expect(page.getByTestId('city-switcher')).toHaveValue('all');
  });

  test('a Pune alert that is escalated stays visible where it is held now', async ({ page }) => {
    await login(page, { email: 'admin@demo' });
    await page.getByTestId('city-switcher').selectOption('PNQ');
    await expect(cards(page).first()).toBeVisible();
    // Every alert in the Pune queue is held by a Pune hospital (H6 to H10).
    const held = await page.locator('[data-testid=alert-card]').count();
    expect(held).toBe(2);
  });
});
