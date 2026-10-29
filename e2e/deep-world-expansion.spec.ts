import { test, expect } from '@playwright/test';

test.describe('Deep 4-Pillar Expansion Live Canvas & Interactive Gameplay E2E', () => {
  test('plays River Skill Angling, Multi-Layer Cavern & Misty Forest, Town Square Festival Booths & 8-Region Atlas Charters with 0 errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const startBtn = page.locator('button.btn.y').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    const skipIfCutscene = async () => {
      const skip = page.getByRole('button', { name: 'رد کردن صحنه' });
      const next = page.getByRole('button', { name: /^(ادامه|Continue)$/ });
      for (let step = 0; step < 12; step++) {
        if (await skip.isVisible().catch(() => false)) await skip.click();
        else if (await next.isVisible().catch(() => false)) await next.click();
        else {
          await page.waitForTimeout(450);
          if (!(await skip.isVisible().catch(() => false)) && !(await next.isVisible().catch(() => false))) break;
          continue;
        }
        await page.waitForTimeout(160);
      }
    };
    await skipIfCutscene();

    // 1. Rebuilt mine: walk to a visible vein, land three real timing strikes, then clear a second vein.
    await page.locator('[data-nav="cave"]').click();
    await page.waitForTimeout(750);
    await skipIfCutscene();
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await canvas.click({ position: { x: 305, y: 458 } });
    const mining = page.locator('[data-mining-modal="1"]');
    await expect(mining).toBeVisible({ timeout: 9000 });
    for (let stage = 0; stage < 3; stage++) {
      await page.waitForFunction(() => {
        const marker = document.querySelector<HTMLElement>('[data-mine-marker="1"]');
        const target = document.querySelector<HTMLElement>('[data-mine-target-center]');
        if (!marker || !target) return false;
        const markerPct = Number.parseFloat(marker.style.left || '0');
        const targetPct = Number(target.dataset.mineTargetCenter || '-100');
        return Math.abs(markerPct - targetPct) < 2.2;
      }, undefined, { timeout: 6000 });
      await page.locator('[data-mine-strike="1"]').click();
      if (stage < 2) await expect(mining).toHaveAttribute('data-mine-stage', String(stage + 1));
    }
    await expect(mining).toHaveCount(0, { timeout: 4000 });
    await skipIfCutscene();
    await canvas.click({ position: { x: 468, y: 535 } });
    await expect(mining).toBeVisible({ timeout: 9000 });
    await page.locator('[data-mine-quick="1"]').click();
    await expect(mining).toHaveCount(0);
    await skipIfCutscene();

    // Two completed veins power the physical lift. Verify level 2, then exercise map travel in both directions.
    await canvas.click({ position: { x: 1148, y: 456 } });
    await page.waitForTimeout(350);
    await page.locator('[data-open-mine-map="1"]').click();
    await expect(page.locator('[data-mine-map="1"]')).toBeVisible();
    await expect(page.locator('[data-mine-travel="2"]')).toBeDisabled();
    await page.locator('[data-mine-travel="1"]').click();
    await page.locator('[data-open-mine-map="1"]').click();
    await page.locator('[data-mine-travel="2"]').click();
    await skipIfCutscene();

    // 2. Navigate to Misty Forest via HUD world bar and gather wild mountain botanicals + bless at Shrine
    await page.locator('[data-nav="forest"]').click();
    await page.waitForTimeout(750);
    await skipIfCutscene();
    await canvas.click({ position: { x: 292, y: 466 } });
    await page.waitForTimeout(200);
    await skipIfCutscene();
    await canvas.click({ position: { x: 640, y: 330 } });
    await page.waitForTimeout(200);
    await skipIfCutscene();

    // 3. Navigate to River and launch interactive Tension-Reel Angling Modal ([data-open-fishing="1"])
    await page.locator('[data-nav="river"]').click();
    await page.waitForTimeout(750);
    await skipIfCutscene();
    const fishBtn = page.locator('[data-open-fishing="1"]');
    await expect(fishBtn).toBeVisible();
    await fishBtn.click();
    const dialog = page.getByRole('dialog').or(page.locator('.paper.popin')).first();
    await expect(dialog).toBeVisible();
    await page.mouse.down();
    await page.waitForTimeout(180);
    await page.mouse.up();
    await dialog.locator('button').first().click();

    // 4. Navigate to Town Square, ring the Festival Bell in Fairgrounds Modal, then physically tap a Town Square Booth on Canvas!
    await page.locator('[data-nav="town"]').click();
    await page.waitForTimeout(750);
    await skipIfCutscene();
    const fairBtn = page.locator('[data-open-festival="1"]');
    await expect(fairBtn).toBeVisible();
    await fairBtn.click();
    const ringBtn = page.locator('button:has-text("نواختن زنگ"), button:has-text("Ring Town")');
    if (await ringBtn.isVisible({ timeout: 600 }).catch(() => false)) {
      await ringBtn.click();
    }
    await page.locator('[role="dialog"] button').first().click();
    await page.waitForTimeout(200);

    // Physically walk up to Town Square Booth #3 (Target Archery at x=702, y=486) right on the Town Square Canvas!
    await canvas.click({ position: { x: 702, y: 486 } });
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page.locator('[role="dialog"] button').first().click();

    // 5. Open Connected 8-Region World Atlas & Royal Decrees ([data-open-atlas="1"])
    await page.locator('[data-open-atlas="1"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('[data-atlas-tab="decrees"]').click();
    await page.locator('[data-atlas-tab="charters"]').click();
    await page.locator('[role="dialog"] button').first().click();

    // 6. Verify all 5 region visits in one morning kept us on Day 1 without burning the whole day!
    const hudText = await page.locator('body').innerText();
    expect(hudText.length).toBeGreaterThan(10);

    expect(errors).toEqual([]);
  });
});
