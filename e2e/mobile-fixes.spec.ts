import { expect, test, type Page } from '@playwright/test';

type DevApi = {
  setEnv: (patch: { scene?: string }) => void;
  openModal: (modal: string | null) => void;
};

async function reachPrologueChoice(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'شروع', exact: true }).click();
  const next = page.locator('[data-cutscene-next="1"]');
  for (let i = 0; i < 50; i++) {
    if (await page.locator('[data-scene-choice="0"]').isVisible()) return;
    if (await next.count() && await next.isEnabled()) await next.click();
    else await page.waitForTimeout(60);
    await page.waitForTimeout(60);
  }
  await expect(page.locator('[data-scene-choice="0"]')).toBeVisible();
}

async function dev(page: Page, scene: string, modal: string | null) {
  await page.evaluate(({ scene, modal }) => {
    const api = (window as unknown as { __gameApi: DevApi }).__gameApi;
    api.setEnv({ scene });
    api.openModal(modal);
  }, { scene, modal });
}

test('mobile choice, fishing, seed filter, DPR and scene targets stay usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await test.step('prologue choices do not overflow', async () => {
    await reachPrologueChoice(page);
    const choices = page.locator('[data-scene-choice]');
    await expect(choices).toHaveCount(2);
    for (const choice of await choices.all()) {
      const metrics = await choice.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const text = button.querySelector('span')!.getBoundingClientRect();
        return {
          client: button.clientWidth,
          scroll: button.scrollWidth,
          left: text.left,
          right: text.right,
          viewport: window.innerWidth,
        };
      });
      expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
      expect(metrics.left).toBeGreaterThanOrEqual(0);
      expect(metrics.right).toBeLessThanOrEqual(metrics.viewport);
    }
  });

  await choicesSelectAndEnter(page);

  await test.step('fishing actions are initially inside the viewport', async () => {
    await dev(page, 'river', 'fishing');
    await expect(page.locator('[data-fishing-minigame="1"]')).toBeVisible();
    for (const selector of ['[data-fish-hold="1"]', '[data-fish-quick="1"]']) {
      const rect = await page.locator(selector).boundingBox();
      expect(rect).not.toBeNull();
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      expect(rect!.height).toBeGreaterThanOrEqual(44);
    }
  });

  await test.step('available seeds are the default and all seeds remain reachable', async () => {
    await dev(page, 'town', 'seed');
    await expect(page.locator('[data-seed-filter="available"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-crop-card]')).toHaveCount(3);
    await expect(page.locator('[data-crop-locked="1"]')).toHaveCount(0);
    await page.locator('[data-seed-filter="all"]').click();
    await expect(page.locator('[data-crop-card]')).toHaveCount(24);
  });

  await test.step('touch DPR stays capped and scene actions are at least 44px', async () => {
    await dev(page, 'cave', null);
    const dpr = Number(await page.locator('canvas').getAttribute('data-render-dpr'));
    expect(dpr).toBeLessThanOrEqual(1.5);
    await page.locator('[data-scene-a11y-toggle="1"]').focus();
    const targets = page.locator('[data-a11y-target]');
    await expect(targets.first()).toBeVisible();
    for (const target of await targets.all()) {
      if (!await target.isVisible()) continue;
      const rect = await target.boundingBox();
      expect(rect!.width).toBeGreaterThanOrEqual(44);
      expect(rect!.height).toBeGreaterThanOrEqual(44);
    }
  });

  expect(errors).toEqual([]);
});

async function choicesSelectAndEnter(page: Page) {
  await page.locator('[data-scene-choice="0"]').click();
  await page.waitForTimeout(250);
  const next = page.locator('[data-cutscene-next="1"]');
  if (await next.count() && await next.isVisible() && await next.isEnabled()) await next.click();
  await expect(next).toHaveCount(0);
  await expect(page.locator('canvas')).toBeVisible();
  const portraitGate = page.locator('[data-portrait-continue="1"]');
  if (await portraitGate.isVisible()) await portraitGate.click();
}
