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

    // Opening the postbox alone must not unseal/read anything. Grandma's parcel
    // still has a sealed-envelope icon until the player explicitly selects it.
    const modal = page.locator('[data-mailbox-modal="1"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const welcomeRow = modal.locator('[data-mail-row="story:welcome"]');
    await expect(welcomeRow).toHaveAttribute('data-mail-read', '0');
    await expect(welcomeRow).toHaveAttribute('data-mail-icon', 'mail');
    await expect(welcomeRow.locator('[data-mail-unread-tag="1"]')).toBeVisible();
    await expect(welcomeRow.locator('[data-mail-parcel-indicator="1"]')).toBeVisible();
    await expect(modal.locator('[data-mail-letter]')).toHaveCount(0);

    // Explicit selection opens the parchment and only then flips to mailopen.
    await welcomeRow.click();
    await expect(modal.locator('[data-mail-letter="story:welcome"]')).toBeVisible();
    await expect(welcomeRow).toHaveAttribute('data-mail-read', '1');
    await expect(welcomeRow).toHaveAttribute('data-mail-icon', 'mailopen');

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
      await expect(modal.locator('[data-mail-letter]')).toHaveCount(0);
    }

    // Ensure zero emoji anywhere in the rendered postal modal
    const modalText = (await modal.textContent()) ?? '';
    expect(/\p{Extended_Pictographic}/u.test(modalText)).toBe(false);

    expect(errors).toEqual([]);
  });

  test('portrait mobile keeps a sealed list, opens one explicit letter, and returns with Back without horizontal overflow', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('button.btn.y').first().click();
    const skipBtn = page.locator('[data-skip-cutscene="1"], button:has-text("رد"), button:has-text("Skip")').first();
    if (await skipBtn.isVisible({ timeout: 2500 }).catch(() => false)) await skipBtn.click();
    const portraitAck = page.getByRole('button', { name: 'ادامه با همین حالت' });
    if (await portraitAck.isVisible({ timeout: 2500 }).catch(() => false)) await portraitAck.click();

    await page.locator('[data-open-mail="1"]').click();
    const modal = page.locator('[data-mailbox-modal="1"]');
    const list = modal.locator('[data-mail-list="1"]');
    const welcomeRow = modal.locator('[data-mail-row="story:welcome"]');
    await expect(list).toBeVisible();
    await expect(welcomeRow).toHaveAttribute('data-mail-icon', 'mail');
    await expect(modal.locator('[data-mail-letter]')).toHaveCount(0);
    await expect(modal.locator('[data-mail-selection-empty="1"]')).toBeHidden();

    await welcomeRow.click();
    const letter = modal.locator('[data-mail-letter="story:welcome"]');
    const back = modal.locator('[data-mail-back="1"]');
    await expect(letter).toBeVisible();
    await expect(list).toBeHidden();
    await expect(back).toBeVisible();
    expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(48);

    await back.click();
    await expect(list).toBeVisible();
    await expect(modal.locator('[data-mail-letter]')).toHaveCount(0);
    await expect(welcomeRow).toHaveAttribute('data-mail-icon', 'mailopen');
    await expect(welcomeRow).toHaveAttribute('data-mail-read', '1');
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflowX).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
});
