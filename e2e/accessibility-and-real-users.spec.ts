import path from 'node:path';
import { expect, test } from '@playwright/test';

const MODAL_IDS = [
  'seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv', 'menu',
  'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum', 'home',
  'almanac', 'mail', 'festival', 'atlas', 'fishing', 'mining', 'mineMap',
] as const;

type Violation = { id: string; impact?: string; nodes: Array<{ target: string[]; failureSummary?: string }> };

async function runAxe(page: import('@playwright/test').Page): Promise<Violation[]> {
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (root: Document, opts: unknown) => Promise<{ violations: Violation[] }> };
    }).axe;
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    });
    return result.violations;
  });
}

test.describe('Real-user accessibility, tutorial and portrait regression gates', () => {
  test.use({ bypassCSP: true });

  test('all 23 dialogs pass WCAG A/AA automated checks and keep keyboard focus contained', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    const skip = page.locator('button:has-text("رد کردن صحنه")');
    if (await skip.count()) await skip.click();
    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { setEnv: (p: { postgame: boolean }) => void } }).__gameApi?.setEnv({ postgame: true });
    });
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });

    for (const id of MODAL_IDS) {
      if (id === 'mining') {
        await page.evaluate(() => {
          (window as unknown as { __gameApi?: { setEnv: (p: { scene: string }) => void } }).__gameApi?.setEnv({ scene: 'cave' });
        });
        await page.waitForTimeout(750);
        await page.locator('canvas').click({ position: { x: 305, y: 458 } });
      } else {
        await page.evaluate((m) => {
          (window as unknown as { __gameApi?: { openModal: (m: string | null) => void } }).__gameApi?.openModal(m);
        }, id);
      }
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog, `dialog ${id}`).toBeVisible();
      await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))), {
        message: `initial focus must enter ${id}`,
      }).toBe(true);
      await expect(dialog.locator('[data-modal-scroll="1"]')).toHaveAttribute('tabindex', '0');
      const violations = await runAxe(page);
      expect(violations, `${id}: ${JSON.stringify(violations)}`).toEqual([]);
      await dialog.locator('[data-modal-scroll="1"]').evaluate((el) => { el.scrollTop = el.scrollHeight; });
      const bottomViolations = await runAxe(page);
      expect(bottomViolations, `${id} at bottom: ${JSON.stringify(bottomViolations)}`).toEqual([]);
      if (id === 'mining') {
        await page.locator('[data-mine-quick="1"]').click();
        await expect(dialog).toHaveCount(0);
      }
    }

    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { openModal: (m: string | null) => void } }).__gameApi?.openModal(null);
    });
    expect(errors).toEqual([]);
  });

  test('English dialogs and every festival tab are translated and pass the same WCAG gate', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    const skip = page.locator('button:has-text("رد کردن صحنه")');
    if (await skip.count()) await skip.click();
    await page.locator('[data-open-settings="1"]').click();
    await page.locator('[data-lang-toggle="1"]').click();
    await expect(page.locator('[data-lang-toggle="1"]')).toHaveText('Language: English');
    await page.locator('[aria-label="Close Modal"]').click();
    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { setEnv: (p: { postgame: boolean }) => void } }).__gameApi?.setEnv({ postgame: true });
    });
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });

    for (const id of MODAL_IDS) {
      if (id === 'mining') {
        await page.locator('[data-nav="cave"]').click();
        await page.waitForTimeout(750);
        const skipEn = page.getByRole('button', { name: 'Skip Scene' });
        if (await skipEn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
          await skipEn.click();
          await expect(skipEn).toHaveCount(0);
        }
        await page.locator('canvas').click({ position: { x: 305, y: 458 } });
      } else {
        await page.evaluate((m) => {
          (window as unknown as { __gameApi?: { openModal: (m: string | null) => void } }).__gameApi?.openModal(m);
        }, id);
      }
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog, `English dialog ${id}`).toBeVisible();
      await expect(dialog, `untranslated Persian in ${id}`).not.toContainText(/[\u0600-\u06FF]/);
      const violations = await runAxe(page);
      expect(violations, `English ${id}: ${JSON.stringify(violations)}`).toEqual([]);
      await dialog.locator('[data-modal-scroll="1"]').evaluate((el) => { el.scrollTop = el.scrollHeight; });
      const bottomViolations = await runAxe(page);
      expect(bottomViolations, `English ${id} at bottom: ${JSON.stringify(bottomViolations)}`).toEqual([]);
      if (id === 'festival') {
        for (const tab of ['cauldron', 'archery', 'prizes']) {
          await page.locator(`[data-fair-tab="${tab}"]`).click();
          await expect(dialog).not.toContainText(/[\u0600-\u06FF]/);
          const tabViolations = await runAxe(page);
          expect(tabViolations, `English festival/${tab}: ${JSON.stringify(tabViolations)}`).toEqual([]);
        }
      }
      if (id === 'mining') {
        await page.locator('[data-mine-quick="1"]').click();
        await expect(dialog).toHaveCount(0);
      }
    }
  });

  test('Tab and Shift+Tab wrap inside a dialog and Escape restores the invoking control', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    const skip = page.locator('button:has-text("رد کردن صحنه")');
    if (await skip.count()) await skip.click();
    const opener = page.locator('[data-open-settings="1"]');
    await opener.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'بستن پنجره' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
    await expect(close).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test('fishing has an operable keyboard hold control and a non-timing alternative', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    const skip = page.locator('button:has-text("رد کردن صحنه")');
    if (await skip.count()) await skip.click();
    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { openModal: (m: string | null) => void } }).__gameApi?.openModal('fishing');
    });
    const hold = page.locator('[data-fish-hold="1"]');
    await hold.focus();
    await page.keyboard.down('Space');
    await expect(hold).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.up('Space');
    await expect(hold).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.down('ArrowUp');
    await expect(hold).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.up('ArrowUp');
    await expect(hold).toHaveAttribute('aria-pressed', 'false');
    await page.locator('[data-fish-quick="1"]').click();
    await expect(page.locator('[data-fishing-minigame="1"]')).toHaveCount(0);
  });

  test('festival cauldron supports keyboard hold without changing its timing rules', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    const skip = page.locator('button:has-text("رد کردن صحنه")');
    if (await skip.count()) await skip.click();
    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { openModal: (m: string | null) => void } }).__gameApi?.openModal('festival');
    });
    await page.locator('[data-fair-tab="cauldron"]').click();
    await page.locator('[data-stir-start="1"]').click();
    const hold = page.locator('[data-stir-hold="1"]');
    await hold.focus();
    await page.keyboard.down('Space');
    await expect(hold).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.up('Space');
    await expect(hold).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.down('ArrowUp');
    await expect(hold).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.up('ArrowUp');
    await expect(hold).toHaveAttribute('aria-pressed', 'false');
  });

  test('real first-day tutorial completes till, plant, water and harvest without dev API shortcuts', async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true }));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    await page.locator('button:has-text("رد کردن صحنه")').click();
    await expect(page.locator('[data-tutorial="1"]')).toBeVisible();

    for (const step of [1, 2, 3]) {
      await page.locator('canvas').click({ position: { x: 478, y: 282 } });
      await expect.poll(() => page.evaluate(() => {
        const raw = localStorage.getItem('mazrae-rangi-save-v1');
        return raw ? JSON.parse(raw).tut?.step : -1;
      })).toBe(step);
      await page.waitForTimeout(2800);
    }
    await page.locator('canvas').click({ position: { x: 478, y: 282 } });
    await expect(page.locator('[data-tutorial="1"]')).toHaveCount(0);
    await page.waitForTimeout(2800);

    await page.locator('[data-open-settings="1"]').click();
    await page.getByRole('button', { name: 'ذخیره', exact: true }).click();
    const result = await page.evaluate(() => {
      const raw = localStorage.getItem('mazrae-rangi-save-v1');
      const save = raw ? JSON.parse(raw) : null;
      return { tut: save?.tut, wheat: save?.pack?.wheat ?? 0, harvests: save?.stats?.harv ?? 0 };
    });
    expect(result.tut?.done).toBe(true);
    expect(result.wheat).toBeGreaterThan(0);
    expect(result.harvests).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('the complete prologue is keyboard-playable and consequential choices cannot be bypassed', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    const scene = page.locator('[data-tap="cutscene"]');
    const next = page.locator('[data-cutscene-next="1"]');
    await expect(scene).toBeVisible();
    await expect(next).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => {
      const root = document.querySelector('[data-tap="cutscene"]');
      return Boolean(root && document.activeElement === root.querySelector('button'));
    })).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect(next).toBeFocused();

    let chose = false;
    for (let guard = 0; guard < 60 && !chose; guard++) {
      if (!(await scene.count())) break;
      const choices = page.locator('[data-scene-choice]');
      if (await choices.count()) {
        await expect(page.locator('[data-beat-node="p7"]')).toBeVisible();
        await expect(next).toBeDisabled();
        await expect(choices.first()).toBeFocused();
        await scene.click({ position: { x: 20, y: 200 } });
        await expect(choices).toHaveCount(2);
        await expect(page.locator('[data-beat-node="p7"]')).toBeVisible();
        await choices.nth(1).focus();
        await page.keyboard.press('Enter');
        chose = true;
      } else {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(70);
      }
    }
    expect(chose, 'prologue must reach its real p7 choice').toBe(true);
    await expect(scene).toHaveCount(0, { timeout: 6000 });
    const choiceSeen = await page.evaluate(() => {
      const raw = localStorage.getItem('mazrae-rangi-save-v1');
      return raw ? Boolean(JSON.parse(raw).story?.seen?.['choice:p7']) : false;
    });
    expect(choiceSeen).toBe(true);
  });

  test('portrait gate leads to a usable portrait game, not merely a rotate screenshot', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('button').first().click();
    await page.locator('button:has-text("رد کردن صحنه")').click();
    await page.getByRole('button', { name: 'ادامه با همین حالت' }).click();
    await expect(page.getByRole('button', { name: 'ادامه با همین حالت' })).toHaveCount(0);
    await page.waitForTimeout(4400);
    for (const nav of ['farm', 'north', 'valley', 'town', 'river', 'cave', 'apiary', 'forest']) {
      const box = await page.locator(`[data-nav="${nav}"]`).boundingBox();
      expect(box, nav).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(391);
      expect(box!.y + box!.height).toBeLessThanOrEqual(845);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('portrait-after-ack.png') });
    await page.locator('[data-open-settings="1"]').click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    expect(box!.y + box!.height).toBeLessThanOrEqual(845);
    await page.screenshot({ path: testInfo.outputPath('portrait-settings.png') });
  });
});
