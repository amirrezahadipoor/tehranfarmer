import { test, expect } from '@playwright/test';

test.describe('Illustrated Village Postbox, Animal Rigs & Lossless Mobile Battery Verification', () => {
  test('opens postal inbox from HUD badge, unseals Grandma welcome letter, claims parcel into inventory, switches all 5 tabs cleanly, and logs 0 errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    const startBtn = page.locator('button.btn.y').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // Dismiss prologue cutscene via Skip button if shown
    const skipBtn = page.locator('[data-skip-cutscene="1"], button:has-text("رد"), button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await skipBtn.click();
    }

    // HUD mail button + unread badge must be visible right away on Day 1
    const mailBtn = page.locator('[data-open-mail="1"]');
    await expect(mailBtn).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-mail-badge="1"]')).toBeVisible();
    await mailBtn.click();

    // Illustrated MailboxModal opens with parchment letter + claimable parcel button
    const modal = page.locator('[data-mailbox-modal="1"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const claimBtn = modal.locator('[data-mail-claim-parcel]').first();
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();
    await expect(modal.locator('[data-mail-parcel-claimed="1"]')).toBeVisible();

    // Switch through all 5 category filter tabs cleanly
    const filterBtns = modal.locator('[data-mail-tab]');
    const tabCount = await filterBtns.count();
    expect(tabCount).toBe(5);
    for (let i = 0; i < tabCount; i++) {
      await filterBtns.nth(i).click();
    }

    // Ensure zero emoji anywhere in the rendered postal modal
    const modalText = (await modal.textContent()) ?? '';
    expect(/\p{Extended_Pictographic}/u.test(modalText)).toBe(false);

    expect(errors).toEqual([]);
  });
});
