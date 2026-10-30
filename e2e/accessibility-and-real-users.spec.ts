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
  test.use({ bypassCSP: true, hasTouch: true });

  test('all 23 dialogs pass WCAG A/AA automated checks and keep keyboard focus contained', async ({ page }) => {
    test.setTimeout(150_000);
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
    test.setTimeout(150_000);
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

  test('canvas and semantic scene mirror support keyboard-only plot and NPC interaction', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    const skip = page.locator('button:has-text("رد کردن صحنه")');
    if (await skip.count()) await skip.click();

    const canvas = page.locator('#game-canvas');
    await expect(canvas).toHaveAttribute('role', 'application');
    await expect(canvas).toHaveAttribute('tabindex', '0');
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await expect(canvas).toHaveAttribute('aria-label', /کرت ۲|Plot 2/);
    await page.keyboard.press('ArrowLeft');
    await expect(canvas).toHaveAttribute('aria-label', /کرت ۱|Plot 1/);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem('mazrae-rangi-save-v1');
      return raw ? JSON.parse(raw).tut?.step : -1;
    })).toBe(1);

    const panelToggle = page.locator('[data-scene-a11y-toggle="1"]');
    await panelToggle.focus();
    await expect(panelToggle).toBeVisible();
    await panelToggle.click();
    await expect(page.locator('[data-scene-a11y="1"]')).toHaveAttribute('data-pinned', '1');
    await expect(page.locator('[data-a11y-plot-select="1"]')).toBeVisible();
    await expect(page.locator('[data-a11y-plot-select="1"] option').first()).toContainText(/کرت ۱|Plot 1/);

    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { setEnv: (p: { scene: 'town'; postgame: boolean }) => void } }).__gameApi?.setEnv({ scene: 'town', postgame: true });
    });
    await page.waitForTimeout(800);
    const npc = page.locator('[data-a11y-target="npc:0"]');
    await npc.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tap="cutscene"]')).toBeVisible();
    const npcSkip = page.locator('button:has-text("رد کردن صحنه")');
    if (await npcSkip.count()) await npcSkip.click();

    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { setEnv: (p: { scene: 'farm'; postgame: boolean }) => void } }).__gameApi?.setEnv({ scene: 'farm', postgame: true });
    });
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
    const violations = await runAxe(page);
    expect(violations, `gameplay canvas: ${JSON.stringify(violations)}`).toEqual([]);
  });

  test('real first-day tutorial completes farm, sale, ledger and rest without dev API shortcuts', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    await page.locator('button:has-text("رد کردن صحنه")').click();
    await expect(page.locator('[data-tutorial="1"]')).toBeVisible();
    await expect(page.locator('[data-tutorial-title="1"]')).toHaveText('کرت را شخم بزن');
    await expect(page.locator('[data-tutorial-progress="1"]')).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('[data-tutorial-target="1"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'رد کردن آموزش' })).toBeVisible();
    await page.getByRole('button', { name: 'جمع کردن راهنما' }).click();
    await expect(page.locator('[data-tutorial-card="1"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'باز کردن راهنمای روز اول' }).click();
    await expect(page.locator('[data-tutorial-card="1"]')).toBeVisible();

    for (const step of [1, 2, 3]) {
      await page.locator('canvas').click({ position: { x: 478, y: 282 } });
      await expect.poll(() => page.evaluate(() => {
        const raw = localStorage.getItem('mazrae-rangi-save-v1');
        return raw ? JSON.parse(raw).tut?.step : -1;
      })).toBe(step);
      await page.waitForTimeout(2800);
    }
    await page.locator('canvas').click({ position: { x: 478, y: 282 } });
    await expect(page.locator('[data-tutorial="1"]')).toHaveAttribute('data-tutorial-step', '4');
    await expect(page.locator('[data-tutorial-title="1"]')).toHaveText('گندم را بفروش');
    await page.waitForTimeout(2800);

    // Sell one harvested wheat through the actual town and market controls.
    await page.locator('[data-nav="town"]').click();
    const townSkip = page.locator('button:has-text("رد کردن صحنه")');
    await expect(townSkip).toBeVisible({ timeout: 5000 });
    await townSkip.click();
    await expect(page.locator('[data-tap="cutscene"]')).toHaveCount(0);
    await page.locator('canvas').click({ position: { x: 350, y: 300 } });
    const marketSkip = page.locator('button:has-text("رد کردن صحنه")');
    await expect(marketSkip).toBeVisible({ timeout: 5000 });
    await marketSkip.click();
    await expect(page.locator('[data-tap="cutscene"]')).toHaveCount(0);
    await expect(page.locator('[data-sell-one="wheat"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-sell-one="wheat"]').click();
    await page.getByRole('button', { name: 'بستن پنجره' }).click();
    await expect(page.locator('[data-tutorial="1"]')).toHaveAttribute('data-tutorial-step', '5');

    await page.locator('[data-open-ledger="1"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.getByRole('button', { name: 'بستن پنجره' }).click();
    await expect(page.locator('[data-tutorial="1"]')).toHaveAttribute('data-tutorial-step', '6');

    await expect(page.locator('[data-tutorial-title="1"]')).toHaveText('به فردا برو');
    const sleep = page.locator('[data-rest-anytime="1"]');
    await expect(sleep).toBeVisible();
    await expect(page.locator('[data-tutorial-target="1"]')).toBeVisible();
    await sleep.click();
    await expect(page.locator('[data-tutorial="1"]')).toHaveCount(0);

    const result = await page.evaluate(() => {
      const raw = localStorage.getItem('mazrae-rangi-save-v1');
      const save = raw ? JSON.parse(raw) : null;
      return { tut: save?.tut, earned: save?.earned ?? 0, harvests: save?.stats?.harv ?? 0, day: save?.day };
    });
    expect(result.tut?.done).toBe(true);
    expect(result.earned).toBeGreaterThan(0);
    expect(result.harvests).toBeGreaterThan(0);
    expect(result.day).toBe(2);
    expect(errors).toEqual([]);
  });

  test('small-screen first-day guide stays clear and completes through the real Atlas route', async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 640, height: 360 });
    await page.goto('/');
    await page.locator('button').first().click();
    await page.locator('button:has-text("رد کردن صحنه")').click();
    await expect(page.locator('[data-tutorial-card="1"]')).toBeVisible();
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const card = box('[data-tutorial-card="1"]');
      const target = box('[data-tutorial-target="1"]');
      const tool = box('[data-tool="till"]');
      const intersects = (a: DOMRect, b: DOMRect) => Math.max(a.left, b.left) < Math.min(a.right, b.right) && Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom);
      const fonts = [...document.querySelectorAll('[data-tutorial-card="1"] *')].map((el) => parseFloat(getComputedStyle(el).fontSize)).filter(Number.isFinite);
      return {
        inside: card.left >= 0 && card.top >= 0 && card.right <= innerWidth && card.bottom <= innerHeight,
        coversTarget: intersects(card, target), coversTool: intersects(card, tool), minFont: Math.min(...fonts),
      };
    });
    expect(geometry).toEqual({ inside: true, coversTarget: false, coversTool: false, minFont: 11 });

    for (const step of [1, 2, 3]) {
      await page.locator('canvas').click({ position: { x: 239, y: 141 } });
      await expect(page.locator('[data-tutorial="1"]')).toHaveAttribute('data-tutorial-step', String(step));
      await page.waitForTimeout(2800);
    }
    await page.locator('canvas').click({ position: { x: 239, y: 141 } });
    await expect(page.locator('[data-tutorial="1"]')).toHaveAttribute('data-tutorial-step', '4');
    await page.waitForTimeout(2800);

    await page.locator('[data-mobile-atlas="1"]').click();
    await page.locator('[data-atlas-go="town"]').click();
    const townSkip = page.locator('button:has-text("رد کردن صحنه")');
    await expect(townSkip).toBeVisible({ timeout: 5000 });
    await townSkip.click();
    await page.locator('canvas').click({ position: { x: 175, y: 150 } });
    const marketSkip = page.locator('button:has-text("رد کردن صحنه")');
    await expect(marketSkip).toBeVisible({ timeout: 5000 });
    await marketSkip.click();
    await page.locator('[data-sell-one="wheat"]').click();
    await page.getByRole('button', { name: 'بستن پنجره' }).click();
    await expect(page.locator('[data-tutorial="1"]')).toHaveAttribute('data-tutorial-step', '5');
    await page.locator('[data-open-ledger="1"]').click();
    await page.getByRole('button', { name: 'بستن پنجره' }).click();
    await expect(page.locator('[data-tutorial="1"]')).toHaveAttribute('data-tutorial-step', '6');
    await page.locator('[data-rest-anytime="1"]').click();
    await expect(page.locator('[data-tutorial="1"]')).toHaveCount(0);
    const day = await page.evaluate(() => JSON.parse(localStorage.getItem('mazrae-rangi-save-v1')!).day);
    expect(day).toBe(2);
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

  test('640x360 touch keeps farmhouse rest and comedic inventory details immediately usable', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 640, height: 360 });
    await page.goto('/');
    await page.locator('button').first().click();
    await page.locator('button:has-text("رد کردن صحنه")').click();
    const tutorialSkip = page.getByRole('button', { name: 'رد کردن آموزش' });
    if (await tutorialSkip.isVisible()) await tutorialSkip.click();

    // Actual canvas touch on the farmhouse, not a dev modal shortcut.
    await page.locator('canvas').tap({ position: { x: 70, y: 90 } });
    const sleep = page.locator('[data-home-sleep="1"]');
    await expect(sleep).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('[data-modal-scroll="1"]').evaluate((el) => el.scrollTop)).toBe(0);
    const sleepBox = await sleep.boundingBox();
    expect(sleepBox!.y).toBeGreaterThanOrEqual(0);
    expect(sleepBox!.y + sleepBox!.height).toBeLessThanOrEqual(360);
    await page.getByRole('button', { name: 'بستن پنجره' }).tap();

    await page.locator('[data-open-inventory="1"]').tap();
    const seed = page.locator('[data-inventory-item="barn|seed|wheat"]');
    await expect(seed).toBeVisible();
    await seed.tap();
    const details = page.locator('[data-inventory-details="seed"]');
    await expect(details).toBeVisible();
    await expect(details).toContainText('تشویقِ احساسی');
    const detailBox = await details.boundingBox();
    expect(detailBox!.y).toBeGreaterThanOrEqual(0);
    expect(detailBox!.y + detailBox!.height).toBeLessThanOrEqual(360);
    await expect(page.locator('[data-modal-actions] [data-pack-to-barn="1"]')).toBeVisible();
    await expect(page.locator('[data-artisan-kitchen="1"]')).toBeAttached();

    const minFont = await page.locator('[role="dialog"]').evaluate((root) => {
      let min = Infinity;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const el = node.parentElement;
        if (!el) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        min = Math.min(min, Number.parseFloat(style.fontSize));
      }
      return min;
    });
    expect(minFont).toBeGreaterThanOrEqual(12.9);
  });

  test('all seven backpack tiers really render on canvas, including the frontier renderer', async ({ page }) => {
    await page.addInitScript(() => {
      const hits: Record<string, number> = {};
      (window as unknown as { __bagHits: Record<string, number> }).__bagHits = hits;
      const original = CanvasRenderingContext2D.prototype.fill;
      CanvasRenderingContext2D.prototype.fill = function (...args) {
        const color = String(this.fillStyle);
        if (color.startsWith('#')) hits[color] = (hits[color] ?? 0) + 1;
        return Reflect.apply(original, this, args);
      };
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('button').first().click();
    await page.locator('button:has-text("رد کردن صحنه")').click();
    const tutorialSkip = page.getByRole('button', { name: 'رد کردن آموزش' });
    if (await tutorialSkip.isVisible()) await tutorialSkip.click();
    const colors = ['#b8793f', '#9a6237', '#6f9448', '#3f86ad', '#277d82', '#815ea6', '#9a6a2f'];
    for (let lv = 0; lv < colors.length; lv++) {
      const color = colors[lv]!;
      await page.evaluate(({ lv, color }) => {
        (window as unknown as { __gameApi: { setEnv: (p: { bag: number }) => void } }).__gameApi.setEnv({ bag: lv });
        (window as unknown as { __bagHits: Record<string, number> }).__bagHits[color] = 0;
      }, { lv, color });
      await expect.poll(() => page.evaluate((c) => (window as unknown as { __bagHits: Record<string, number> }).__bagHits[c] ?? 0, color)).toBeGreaterThan(0);
    }
    await page.evaluate(() => {
      (window as unknown as { __gameApi: { setEnv: (p: { scene: string }) => void } }).__gameApi.setEnv({ scene: 'cave' });
      (window as unknown as { __bagHits: Record<string, number> }).__bagHits['#9a6a2f'] = 0;
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __bagHits: Record<string, number> }).__bagHits['#9a6a2f'] ?? 0)).toBeGreaterThan(0);
  });

  test('portrait gate leads to a usable portrait game, not merely a rotate screenshot', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('button').first().click();
    await page.locator('button:has-text("رد کردن صحنه")').click();
    const portraitContinue = page.getByRole('button', { name: 'ادامه با همین حالت' });
    await expect(portraitContinue).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'حالا بچرخان' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(portraitContinue).toBeFocused();
    await expect(page.locator('[data-tutorial="1"]')).toHaveCount(0);
    await portraitContinue.click();
    await expect(portraitContinue).toHaveCount(0);
    await expect(page.locator('[data-tutorial-card="1"]')).toBeVisible();
    await page.waitForTimeout(4400);
    const tutorialSkip = page.getByRole('button', { name: 'رد کردن آموزش' });
    if (await tutorialSkip.isVisible()) await tutorialSkip.click();
    await expect(page.locator('[data-world-nav="compact"]')).toBeVisible();
    await expect(page.locator('[data-world-nav="desktop"]')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath('portrait-after-ack.png') });

    // Every destination remains reachable through the real Atlas, without eight cramped nav buttons.
    await page.locator('[data-mobile-atlas="1"]').click();
    await expect(page.locator('[data-atlas-modal="1"]')).toBeVisible();
    for (const nav of ['farm', 'north', 'valley', 'town', 'river', 'cave', 'apiary', 'forest']) {
      const box = await page.locator(`[data-atlas-go="${nav}"]`).boundingBox();
      expect(box, nav).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(391);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(845);
    }
    await page.locator('[data-atlas-go="town"]').click();
    await expect(page.locator('[data-atlas-modal="1"]')).toHaveCount(0);
    await expect(page.locator('[data-nav="town"]')).toBeDisabled();
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
