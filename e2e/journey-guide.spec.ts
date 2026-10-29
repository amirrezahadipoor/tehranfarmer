import { expect, test } from '@playwright/test';

async function freshGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
  await page.reload();
  await page.waitForFunction(() => Boolean((window as unknown as { __gameApi?: unknown }).__gameApi), null, { timeout: 25_000 });
  await page.locator('button').first().click();
  await expect(page.locator('[data-scene-id="p1"]')).toBeVisible();
  const skip = page.locator('button:has-text("رد کردن صحنه"), button:has-text("Skip")').first();
  await skip.click({ force: true });
  await expect(page.locator('[data-scene-id]')).toHaveCount(0);
}

test('صفحهٔ شروع، روایت فصلِ سِیو را کنار روز و سکه نشان می‌دهد', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('mazrae-rangi-save-v1', JSON.stringify({
      day: 20,
      coins: 9000,
      story: { chapter: 4, postgame: false },
    }));
  });
  await page.reload();
  await expect(page.getByTestId('start-screen')).toBeVisible({ timeout: 25_000 });
  await expect(page.locator('[data-save-story="1"]')).toContainText('قنات و گلخانه');
  await expect(page.getByTestId('start-screen')).toContainText('۲۰');
  await expect(page.getByTestId('start-screen')).toContainText('۹٬۰۰۰');
});

test('دفتر سفر بازیکن را به نجاری، املاک و کارگاهِ شهر هدایت می‌کند', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 800, height: 360 });
  await freshGame(page);
  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { chapter?: number; scene?: 'farm' }) => void } }).__gameApi.setEnv({ chapter: 2, scene: 'farm' });
  });

  await page.locator('[data-open-quests="1"]').click();
  await expect(page.locator('[data-journey-journal="1"]')).toBeVisible();
  await expect(page.locator('[data-journey-chapter="2"]')).toHaveAttribute('data-status', 'current');
  await expect(page.locator('[data-journey-chapter]')).toHaveCount(6);
  await page.locator('[data-chapter-action="carp"]:not([disabled])').first().click();
  await expect(page.getByRole('dialog', { name: 'نجاری' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'بستن پنجره' }).click();

  // Same-scene actions open directly, without another travel transition.
  await page.locator('[data-open-quests="1"]').click();
  await page.locator('[data-chapter-action="carp"]:not([disabled])').first().click();
  await expect(page.getByRole('dialog', { name: 'نجاری' })).toBeVisible();
  await page.getByRole('button', { name: 'بستن پنجره' }).click();

  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { scene?: 'farm' }) => void } }).__gameApi.setEnv({ scene: 'farm' });
  });
  await page.locator('[data-open-quests="1"]').click();
  await page.locator('[data-chapter-action="estate"]:not([disabled])').first().click();
  await expect(page.getByRole('dialog', { name: /املاک/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'بستن پنجره' }).click();

  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { chapter?: number; scene?: 'farm' }) => void } }).__gameApi.setEnv({ chapter: 3, scene: 'farm' });
  });
  await page.locator('[data-open-quests="1"]').click();
  await expect(page.locator('[data-journey-chapter="3"]')).toHaveAttribute('data-status', 'current');
  await page.locator('[data-chapter-action="work"]:not([disabled])').first().click();
  await expect(page.getByRole('dialog', { name: /کارگاه/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'بستن پنجره' }).click();

  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { postgame?: boolean; scene?: 'farm' }) => void } }).__gameApi.setEnv({ postgame: true, scene: 'farm' });
  });
  await page.locator('[data-open-quests="1"]').click();
  await expect(page.locator('[data-journey-chapter][data-status="done"]')).toHaveCount(6);
  await expect(page.locator('[data-journey-recap="1"]')).toContainText('دوباره نفس می‌کشد');
});
