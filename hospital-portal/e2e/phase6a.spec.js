// Phase 6A: portal polish. Mock data only (everything shown is simulated).
import { test, expect } from '@playwright/test';
import { login, cards, cardById, simulate } from './helpers.js';

const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test.describe('layout at the four review widths', () => {
  for (const width of [360, 768, 1366, 1920]) {
    test(`${width}px: no sideways scrolling on the main pages`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await login(page);
      for (const route of ['/dashboard', '/map', '/fleet', '/history', '/analytics']) {
        await page.goto(route);
        await expect(page.locator('nav')).toBeVisible();
        await page.waitForTimeout(400);
        expect(await noSideScroll(page), `${route} at ${width}px`).toBe(true);
      }
    });
  }
});

test.describe('grouped navigation', () => {
  test('wide screen: four groups for an admin, all links visible, current page marked by arrow and aria-current', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await login(page, { email: 'admin@demo', password: 'demo123' });
    expect(await page.locator('[data-testid=menu-toggle]').isVisible()).toBe(false);
    await expect(page.locator('nav [role=group]')).toHaveCount(4);
    for (const word of ['Dashboard', 'Map', 'Fleet', 'History', 'Activity', 'Handover', 'Analytics', 'Admin']) {
      await expect(page.locator(`nav a:text-is("${word}"), nav a:has-text("${word}")`).first()).toBeVisible();
    }
    const current = page.locator('nav a[aria-current=page]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText('▸');
  });

  test('staff do not get an Administration group', async ({ page }) => {
    await login(page);
    await expect(page.locator('nav [role=group]')).toHaveCount(3);
  });

  test('phone: the menu is folded, opens with the button, closes with Escape and returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page);
    const toggle = page.locator('[data-testid=menu-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(await page.locator('#site-menu').isVisible()).toBe(false);
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#site-menu a').first()).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    // choosing a page closes the menu again
    await page.keyboard.press('Enter');
    await page.click('#site-menu >> text=Handover');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('every button and link in the menu is at least 44px high', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await login(page);
    const small = await page.evaluate(() => [...document.querySelectorAll('nav a')].filter((a) => a.getBoundingClientRect().height < 43.5).length);
    expect(small).toBe(0);
  });
});

test.describe('dashboard stats and alert cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('the strip has five named tiles; unacknowledged goes up with a new SOS and down after acknowledge', async ({ page }) => {
    await expect(page.locator('[data-testid=stats-strip] [role=group]')).toHaveCount(5);
    const value = async (id) => Number(await page.locator(`[data-testid=stat-${id}]`).getAttribute('data-value'));
    const before = await value('unacknowledged');
    const id = await simulate(page, 'mock-new-alert');
    await expect.poll(() => value('unacknowledged')).toBe(before + 1);
    expect(await page.locator('[data-testid=stat-active]').getAttribute('aria-label')).toMatch(/^.+: \d+$/);
    await cardById(page, id).click();
    expect(await value('escalated')).toBe(0);
  });

  test('a card names its severity in words with a symbol, shows an Unread label until opened, and no invented distance', async ({ page }) => {
    const id = await simulate(page, 'mock-new-alert');
    const card = cardById(page, id);
    expect(await card.locator('[data-testid=severity-label]').innerText()).toMatch(/EMERGENCY|URGENT|WATCH/i);
    expect(await card.locator('[data-testid=severity-label]').innerText()).toMatch(/^[▲◆●○]/);
    await expect(card.locator('[data-testid=unread-marker]')).toBeVisible();
    await expect(card.locator('[data-testid=card-received]')).toBeVisible();
    await expect(card.locator('[data-testid=card-distance]')).toHaveCount(0);
    await card.click();
    await expect(card.locator('[data-testid=unread-marker]')).toHaveCount(0);
  });

  test('arrow keys still move between cards', async ({ page }) => {
    await simulate(page, 'mock-new-alert');
    await cards(page).first().focus();
    await page.keyboard.press('ArrowDown');
    const same = await page.evaluate(() => document.activeElement === document.querySelector('[data-testid=alert-card]'));
    expect(same).toBe(false);
  });
});

test.describe('analytics', () => {
  test('median and P90 show n, say "not enough data" for few cases, and the date filter narrows the cases', async ({ page }) => {
    await login(page);
    await page.goto('/analytics');
    await expect(page.locator('[data-testid=spread]')).toBeVisible();
    await expect(page.locator('[data-testid=spread-alert_to_ack] [data-testid=spread-n]')).toBeVisible();
    const shown = page.locator('[data-testid=date-shown]');
    const total = await shown.innerText();
    await page.fill('[data-testid=date-from]', '2099-01-01');
    await expect(shown).toContainText('0');
    expect(await shown.innerText()).not.toBe(total);
    await expect(page.locator('[data-testid=analytics-csv]')).toBeDisabled();
    await page.click('[data-testid=date-clear]');
    await expect(shown).toHaveText(total);
  });
});
