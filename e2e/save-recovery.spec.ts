import { expect, test } from '@playwright/test';

test('اجرای واقعی Save/Load وسط پرولوگ و حفظ نتیجهٔ Skip پس از reload ناگهانی', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.setViewportSize({ width: 850, height: 393 });
  // A fresh Playwright context starts with isolated storage; avoid clearing the live React store and reloading.
  await page.goto('/');
  await page.getByRole('button', { name: 'شروع' }).click();
  await expect(page.locator('[data-scene-id="p1"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('mazrae-rangi-save-v1') ?? '{}') as { story?: { pending?: string } };
    return save.story?.pending ?? null;
  })).toBe('p1');

  // Sudden close/reopen while a story cutscene is still pending: continue must resume, not discard the save.
  await page.reload();
  await expect(page.getByRole('button', { name: /ادامه/ })).toBeVisible();
  await page.getByRole('button', { name: /ادامه/ }).click();
  await expect(page.locator('[data-scene-id="p1"]')).toBeVisible();

  // Skip has permanent progression effects; another reload must not replay the finished prologue.
  await page.getByRole('button', { name: 'رد کردن صحنه' }).click();
  await expect(page.locator('[data-scene-id="p1"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('mazrae-rangi-save-v1') ?? '{}') as {
      story?: { pending?: string | null; prologueSeen?: boolean };
      debt?: unknown;
    };
    return Boolean(save.story?.prologueSeen && save.story.pending == null && save.debt);
  })).toBe(true);

  await page.reload();
  await expect(page.getByRole('button', { name: /ادامه/ })).toBeVisible();
  await page.getByRole('button', { name: /ادامه/ }).click();
  await expect(page.locator('[data-testid="start-screen"]')).toHaveCount(0);
  await expect(page.locator('[data-scene-id="p1"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as {
    __gameApi: { summary: () => { scene: string } };
  }).__gameApi.summary().scene)).toBe('farm');
  expect(errors).toEqual([]);
});
